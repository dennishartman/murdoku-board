import { analyzeHumanSolve, type HumanCandidateSolution } from "./humanSolver";
import type { BoardGrid, BoardSolution, CharacterGender, Hint, HintSubject, HintTarget, PlayLetter, SolutionPosition } from "../types/board";

type PositionedLetter = {
  letter: PlayLetter;
  row: number;
  col: number;
  roomId: string | null;
};

type TargetCell = {
  row: number;
  col: number;
  roomId: string | null;
  target: HintTarget;
};

type CandidateResult = {
  candidates: HumanCandidateSolution[];
  capped: boolean;
};

type HintSelectionResult =
  | { ok: true; hints: Hint[]; remainingSolutions: number; humanPlacedCount: number }
  | { ok: false; hints: Hint[]; remainingSolutions: number; humanPlacedCount: number; message: string };

type GenerateHintsResult =
  | { ok: true; hints: Hint[]; candidateCount: number; message: string }
  | { ok: false; hints: []; candidateCount: number; message: string };

const CANDIDATE_LIMIT = 8000;

function getGeneralHintLimit(board: BoardGrid) {
  return board.difficulty === "hard" ? 1 : 2;
}

function getMaxHintCount(board: BoardGrid) {
  if (board.difficulty === "hard") {
    return board.activeLetters.length * 2 + getGeneralHintLimit(board);
  }

  return board.activeLetters.length * 3 + getGeneralHintLimit(board);
}

function getCell(board: BoardGrid, row: number, col: number) {
  return board.cells.find((cell) => cell.row === row && cell.col === col) ?? null;
}

function getCellRoomId(board: BoardGrid, position: SolutionPosition | undefined) {
  if (!position) {
    return null;
  }

  return getCell(board, position.row, position.col)?.roomId ?? null;
}

function getPosition(solution: BoardSolution, letter: PlayLetter) {
  return solution[letter];
}

function makePosition(row: number, col: number): SolutionPosition {
  return { row, col };
}

function positionKey(position: SolutionPosition) {
  return `${position.row}:${position.col}`;
}

function isCorner(board: BoardGrid, position: SolutionPosition) {
  return (position.row === 0 || position.row === board.rows - 1) && (position.col === 0 || position.col === board.cols - 1);
}

function isEdge(board: BoardGrid, position: SolutionPosition) {
  return position.row === 0 || position.col === 0 || position.row === board.rows - 1 || position.col === board.cols - 1;
}

function isAdjacent(a: SolutionPosition, b: SolutionPosition) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function isDiagonal(a: SolutionPosition, b: SolutionPosition) {
  return Math.abs(a.row - b.row) === 1 && Math.abs(a.col - b.col) === 1;
}

function distanceByAxis(a: SolutionPosition, b: SolutionPosition, axis: "row" | "col" | "either") {
  if (axis === "row") {
    return Math.abs(a.row - b.row);
  }

  if (axis === "col") {
    return Math.abs(a.col - b.col);
  }

  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function compareDistance(actual: number, expected: number, relation: "exactly" | "not_exactly" | "at_least" | "at_most") {
  if (relation === "not_exactly") {
    return actual !== expected;
  }

  if (relation === "at_least") {
    return actual >= expected;
  }

  if (relation === "at_most") {
    return actual <= expected;
  }

  return actual === expected;
}

function uniqueHints(hints: Hint[]) {
  const seen = new Set<string>();
  const result: Hint[] = [];

  for (const hint of hints) {
    const key = JSON.stringify(hint);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(hint);
    }
  }

  return result;
}

function getSolutionPositions(board: BoardGrid, solution: BoardSolution | null = board.solution) {
  if (!solution) {
    return [];
  }

  const result: PositionedLetter[] = [];

  for (const letter of board.activeLetters) {
    const position = getPosition(solution, letter);

    if (!position) {
      continue;
    }

    result.push({
      letter,
      row: position.row,
      col: position.col,
      roomId: getCellRoomId(board, position)
    });
  }

  return result;
}

function targetKey(kind: "object" | "obstacle", typeId: string, roomId: string | null) {
  return `${kind}:${typeId}:${roomId ?? "no-room"}`;
}

function getTargets(board: BoardGrid) {
  const counts = new Map<string, number>();

  for (const cell of board.cells) {
    if (cell.isObject && cell.objectType) {
      const key = targetKey("object", cell.objectType, cell.roomId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    if (cell.isBlocked && cell.obstacleType) {
      const key = targetKey("obstacle", cell.obstacleType, cell.roomId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const result: TargetCell[] = [];

  for (const cell of board.cells) {
    if (!cell.isActive) {
      continue;
    }

    if (cell.isObject && cell.objectType) {
      const roomScopedKey = targetKey("object", cell.objectType, cell.roomId);
      const roomScopedIsUnique = counts.get(roomScopedKey) === 1;

      result.push({
        row: cell.row,
        col: cell.col,
        roomId: cell.roomId,
        target: {
          kind: "object",
          objectType: cell.objectType,
          roomId: roomScopedIsUnique ? cell.roomId : null
        }
      });
    }

    if (cell.isBlocked && cell.obstacleType) {
      const roomScopedKey = targetKey("obstacle", cell.obstacleType, cell.roomId);
      const roomScopedIsUnique = counts.get(roomScopedKey) === 1;

      result.push({
        row: cell.row,
        col: cell.col,
        roomId: cell.roomId,
        target: {
          kind: "obstacle",
          obstacleType: cell.obstacleType,
          roomId: roomScopedIsUnique ? cell.roomId : null
        }
      });
    }
  }

  return result.sort((a, b) => a.row - b.row || a.col - b.col || a.target.kind.localeCompare(b.target.kind));
}

function subjectLetter(subject: HintSubject | undefined) {
  return subject?.kind === "character" ? subject.letter : null;
}

function hintSubjectLetter(hint: Hint) {
  if (hint.type === "murderer_room") {
    return hint.victimLetter;
  }

  if (hint.type === "room_person_count") {
    return null;
  }

  if (hint.type === "room_group_count") {
    return subjectLetter(hint.subject);
  }

  return subjectLetter(hint.subject);
}

function hintCoversLetter(hint: Hint, letter: PlayLetter) {
  return hintSubjectLetter(hint) === letter;
}

function isGeneralHint(hint: Hint) {
  return hint.type === "room_person_count" || (hint.type === "room_group_count" && !hint.subject);
}

function isPositiveRoomHint(hint: Hint) {
  return hint.type === "room" && hint.relation === "is_in";
}

function isNegativeRoomHint(hint: Hint) {
  return hint.type === "room" && hint.relation === "is_not_in";
}

function isDirectPlacementHint(hint: Hint) {
  return hint.type === "row_column" || isPositiveRoomHint(hint);
}

function isValidCandidateCell(board: BoardGrid, row: number, col: number) {
  const cell = getCell(board, row, col);
  return Boolean(cell?.isActive && !cell.isBlocked && !cell.isObject && cell.roomId);
}

function inferMurdererLetter(board: BoardGrid, solution: BoardSolution) {
  const victimRoomId = getCellRoomId(board, getPosition(solution, "V"));

  if (!victimRoomId) {
    return null;
  }

  const suspectsInRoom = board.activeLetters.filter((letter) => {
    if (letter === "V") {
      return false;
    }

    return getCellRoomId(board, getPosition(solution, letter)) === victimRoomId;
  });

  return suspectsInRoom.length === 1 ? suspectsInRoom[0] ?? null : null;
}

function makeSolutionKey(board: BoardGrid, solution: BoardSolution) {
  return board.activeLetters
    .map((letter) => {
      const position = getPosition(solution, letter);
      return `${letter}:${position?.row ?? "?"},${position?.col ?? "?"}`;
    })
    .join("|");
}

function makeCandidateSolution(board: BoardGrid, solution: BoardSolution) {
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  for (const letter of board.activeLetters) {
    const position = getPosition(solution, letter);

    if (!position || !isValidCandidateCell(board, position.row, position.col)) {
      return null;
    }

    if (usedRows.has(position.row) || usedCols.has(position.col)) {
      return null;
    }

    usedRows.add(position.row);
    usedCols.add(position.col);
  }

  const murdererLetter = inferMurdererLetter(board, solution);

  if (!murdererLetter) {
    return null;
  }

  return {
    solution: { ...solution },
    murdererLetter,
    key: makeSolutionKey(board, solution)
  } satisfies HumanCandidateSolution;
}

function shouldPrunePartial(board: BoardGrid, solution: BoardSolution) {
  const victimRoomId = getCellRoomId(board, getPosition(solution, "V"));

  if (!victimRoomId) {
    return false;
  }

  const suspectsInVictimRoom = board.activeLetters.filter((letter) => {
    if (letter === "V") {
      return false;
    }

    const position = getPosition(solution, letter);
    return Boolean(position && getCellRoomId(board, position) === victimRoomId);
  });

  return suspectsInVictimRoom.length > 1;
}

function enumerateCandidateSolutions(board: BoardGrid, limit = CANDIDATE_LIMIT): CandidateResult {
  const candidates: HumanCandidateSolution[] = [];
  const seen = new Set<string>();
  let capped = false;

  function addCandidate(solution: BoardSolution) {
    const candidate = makeCandidateSolution(board, solution);

    if (!candidate || seen.has(candidate.key)) {
      return;
    }

    seen.add(candidate.key);
    candidates.push(candidate);
  }

  if (board.solution) {
    addCandidate(board.solution);
  }

  const validCells = board.cells
    .filter((cell) => cell.isActive && !cell.isBlocked && !cell.isObject && cell.roomId)
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const rowCount = new Set(validCells.map((cell) => cell.row)).size;
  const colCount = new Set(validCells.map((cell) => cell.col)).size;

  if (rowCount !== board.activeLetters.length || colCount !== board.activeLetters.length) {
    return { candidates, capped };
  }

  const orderedLetters: PlayLetter[] = ["V", ...board.activeLetters.filter((letter) => letter !== "V")];
  const workingSolution: BoardSolution = {};
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  function backtrack(index: number) {
    if (candidates.length >= limit) {
      capped = true;
      return;
    }

    if (index >= orderedLetters.length) {
      addCandidate(workingSolution);
      return;
    }

    const letter = orderedLetters[index];

    if (!letter) {
      return;
    }

    for (const cell of validCells) {
      if (usedRows.has(cell.row) || usedCols.has(cell.col)) {
        continue;
      }

      workingSolution[letter] = makePosition(cell.row, cell.col);
      usedRows.add(cell.row);
      usedCols.add(cell.col);

      if (!shouldPrunePartial(board, workingSolution)) {
        backtrack(index + 1);
      }

      delete workingSolution[letter];
      usedRows.delete(cell.row);
      usedCols.delete(cell.col);

      if (capped) {
        return;
      }
    }
  }

  backtrack(0);
  return { candidates, capped };
}

function positionsForSubject(board: BoardGrid, candidate: HumanCandidateSolution, subject: HintSubject) {
  if (subject.kind === "character") {
    const position = getPosition(candidate.solution, subject.letter);
    return position ? [position] : [];
  }

  return board.activeLetters
    .filter((letter) => board.activeCharacters[letter]?.gender === subject.gender)
    .map((letter) => getPosition(candidate.solution, letter))
    .filter((position): position is SolutionPosition => Boolean(position));
}

function positionsForTarget(board: BoardGrid, candidate: HumanCandidateSolution, target: HintTarget) {
  if (target.kind === "character") {
    const position = getPosition(candidate.solution, target.letter);
    return position ? [position] : [];
  }

  if (target.kind === "gender") {
    return board.activeLetters
      .filter((letter) => board.activeCharacters[letter]?.gender === target.gender)
      .map((letter) => getPosition(candidate.solution, letter))
      .filter((position): position is SolutionPosition => Boolean(position));
  }

  if (target.kind === "object") {
    return board.cells
      .filter((cell) => cell.isActive && cell.isObject && (!target.objectType || cell.objectType === target.objectType) && (!target.roomId || cell.roomId === target.roomId))
      .map((cell) => makePosition(cell.row, cell.col));
  }

  return board.cells
    .filter((cell) => cell.isActive && cell.isBlocked && (!target.obstacleType || cell.obstacleType === target.obstacleType) && (!target.roomId || cell.roomId === target.roomId))
    .map((cell) => makePosition(cell.row, cell.col));
}

function evaluatePairHint(
  board: BoardGrid,
  candidate: HumanCandidateSolution,
  subject: HintSubject,
  target: HintTarget,
  relation: "is" | "is_not",
  predicate: (subjectPosition: SolutionPosition, targetPosition: SolutionPosition) => boolean
) {
  const subjectPositions = positionsForSubject(board, candidate, subject);
  const targetPositions = positionsForTarget(board, candidate, target);
  const hasMatch = subjectPositions.some((subjectPosition) => targetPositions.some((targetPosition) => predicate(subjectPosition, targetPosition)));
  return relation === "is" ? hasMatch : !hasMatch;
}

function evaluateHintForCandidate(board: BoardGrid, candidate: HumanCandidateSolution, hint: Hint) {
  if (hint.type === "murderer_room") {
    return candidate.murdererLetter !== null;
  }

  if (hint.type === "room_person_count") {
    const count = board.activeLetters.filter((letter) => getCellRoomId(board, getPosition(candidate.solution, letter)) === hint.roomId).length;
    return count === hint.count;
  }

  if (hint.type === "row_column") {
    const subjectPositions = positionsForSubject(board, candidate, hint.subject);
    const targetIndex = hint.index - 1;
    const hasMatch = subjectPositions.some((position) => (hint.axis === "row" ? position.row : position.col) === targetIndex);
    return hint.relation === "is" ? hasMatch : !hasMatch;
  }

  if (hint.type === "room") {
    const subjectPositions = positionsForSubject(board, candidate, hint.subject);
    const hasMatch = subjectPositions.some((position) => getCellRoomId(board, position) === hint.roomId);
    return hint.relation === "is_in" ? hasMatch : !hasMatch;
  }

  if (hint.type === "adjacent") {
    return evaluatePairHint(board, candidate, hint.subject, hint.target, hint.relation, isAdjacent);
  }

  if (hint.type === "diagonal") {
    return evaluatePairHint(board, candidate, hint.subject, hint.target, hint.relation, isDiagonal);
  }

  if (hint.type === "edge") {
    const subjectPositions = positionsForSubject(board, candidate, hint.subject);
    const hasMatch = subjectPositions.some((position) => {
      if (hint.edgeType === "corner") {
        return isCorner(board, position);
      }

      if (hint.edgeType === "top") {
        return position.row === 0;
      }

      if (hint.edgeType === "right") {
        return position.col === board.cols - 1;
      }

      if (hint.edgeType === "bottom") {
        return position.row === board.rows - 1;
      }

      if (hint.edgeType === "left") {
        return position.col === 0;
      }

      return isEdge(board, position);
    });

    return hint.relation === "is" ? hasMatch : !hasMatch;
  }

  if (hint.type === "distance") {
    return evaluatePairHint(board, candidate, hint.subject, hint.target, "is", (subjectPosition, targetPosition) => {
      return compareDistance(distanceByAxis(subjectPosition, targetPosition, hint.axis), hint.distance, hint.relation);
    });
  }

  if (hint.type === "direction") {
    return evaluatePairHint(board, candidate, hint.subject, hint.target, hint.relation, (subjectPosition, targetPosition) => {
      if (hint.direction === "above") {
        return subjectPosition.row < targetPosition.row;
      }

      if (hint.direction === "below") {
        return subjectPosition.row > targetPosition.row;
      }

      if (hint.direction === "left_of") {
        return subjectPosition.col < targetPosition.col;
      }

      return subjectPosition.col > targetPosition.col;
    });
  }

  if (hint.type === "room_group_count") {
    const lettersInRoom = board.activeLetters.filter((letter) => getCellRoomId(board, getPosition(candidate.solution, letter)) === hint.roomId);
    const matchingLetters = lettersInRoom.filter((letter) => board.activeCharacters[letter]?.gender === hint.group.gender);

    if (!hint.subject || hint.countMode === "total") {
      return matchingLetters.length === hint.count;
    }

    const subject = hint.subject;
    const subjectLetters: PlayLetter[] = subject.kind === "character"
      ? [subject.letter]
      : board.activeLetters.filter((letter) => board.activeCharacters[letter]?.gender === subject.gender);
    const subjectIsInRoom = subjectLetters.some((letter) => lettersInRoom.includes(letter));

    if (!subjectIsInRoom) {
      return false;
    }

    if (hint.countMode === "including_subject") {
      return matchingLetters.length === hint.count;
    }

    return matchingLetters.filter((letter) => !subjectLetters.includes(letter)).length === hint.count;
  }

  return false;
}

function filterCandidateSolutions(board: BoardGrid, candidates: HumanCandidateSolution[], hint: Hint) {
  return candidates.filter((candidate) => evaluateHintForCandidate(board, candidate, hint));
}

function distinctPositionCount(candidates: HumanCandidateSolution[], letter: PlayLetter) {
  const positions = new Set<string>();

  for (const candidate of candidates) {
    const position = getPosition(candidate.solution, letter);

    if (position) {
      positions.add(positionKey(position));
    }
  }

  return positions.size;
}

function addRoomHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    if (!position.roomId) {
      continue;
    }

    hints.push({
      id: `room-${position.letter}-${position.roomId}`,
      type: "room",
      subject: { kind: "character", letter: position.letter },
      roomId: position.roomId,
      relation: "is_in"
    });

    if (board.difficulty === "hard") {
      for (const room of board.rooms) {
        if (room.id === position.roomId) {
          continue;
        }

        hints.push({
          id: `not-room-${position.letter}-${room.id}`,
          type: "room",
          subject: { kind: "character", letter: position.letter },
          roomId: room.id,
          relation: "is_not_in"
        });
      }
    }
  }
}

function addRowColumnHints(positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    hints.push({
      id: `row-${position.letter}`,
      type: "row_column",
      subject: { kind: "character", letter: position.letter },
      axis: "row",
      index: position.row + 1,
      relation: "is"
    });

    hints.push({
      id: `col-${position.letter}`,
      type: "row_column",
      subject: { kind: "character", letter: position.letter },
      axis: "col",
      index: position.col + 1,
      relation: "is"
    });
  }
}

function addEdgeHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    const candidatePosition = makePosition(position.row, position.col);

    if (isCorner(board, candidatePosition)) {
      hints.push({
        id: `corner-${position.letter}`,
        type: "edge",
        subject: { kind: "character", letter: position.letter },
        edgeType: "corner",
        relation: "is"
      });
      continue;
    }

    hints.push({
      id: isEdge(board, candidatePosition) ? `edge-${position.letter}` : `not-edge-${position.letter}`,
      type: "edge",
      subject: { kind: "character", letter: position.letter },
      edgeType: "any_edge",
      relation: isEdge(board, candidatePosition) ? "is" : "is_not"
    });
  }
}

function addTargetHints(positions: PositionedLetter[], targets: TargetCell[], hints: Hint[]) {
  for (const position of positions) {
    const positionValue = makePosition(position.row, position.col);

    for (const target of targets) {
      const targetPosition = makePosition(target.row, target.col);
      const targetSuffix = `${target.row}-${target.col}-${target.target.kind}-${target.roomId ?? "no-room"}`;

      if (isAdjacent(positionValue, targetPosition)) {
        hints.push({
          id: `adjacent-${position.letter}-${targetSuffix}`,
          type: "adjacent",
          subject: { kind: "character", letter: position.letter },
          target: target.target,
          relation: "is"
        });
      }

      if (isDiagonal(positionValue, targetPosition)) {
        hints.push({
          id: `diagonal-${position.letter}-${targetSuffix}`,
          type: "diagonal",
          subject: { kind: "character", letter: position.letter },
          target: target.target,
          relation: "is"
        });
      }

      if (target.row === position.row && target.col !== position.col) {
        hints.push({
          id: `same-row-distance-${position.letter}-${targetSuffix}`,
          type: "distance",
          subject: { kind: "character", letter: position.letter },
          target: target.target,
          axis: "col",
          distance: Math.abs(position.col - target.col),
          relation: "exactly"
        });
      }

      if (target.col === position.col && target.row !== position.row) {
        hints.push({
          id: `same-col-distance-${position.letter}-${targetSuffix}`,
          type: "distance",
          subject: { kind: "character", letter: position.letter },
          target: target.target,
          axis: "row",
          distance: Math.abs(position.row - target.row),
          relation: "exactly"
        });
      }

      if (target.row !== position.row || target.col !== position.col) {
        const rowDistance = Math.abs(position.row - target.row);
        const colDistance = Math.abs(position.col - target.col);
        const direction = rowDistance >= colDistance
          ? position.row < target.row ? "above" : "below"
          : position.col < target.col ? "left_of" : "right_of";

        hints.push({
          id: `direction-${position.letter}-${targetSuffix}`,
          type: "direction",
          subject: { kind: "character", letter: position.letter },
          target: target.target,
          direction,
          relation: "is"
        });
      }
    }
  }
}

function addCharacterGenderRoomHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    if (!position.roomId) {
      continue;
    }

    const gender: CharacterGender | undefined = board.activeCharacters[position.letter]?.gender;

    if (!gender) {
      continue;
    }

    const count = positions.filter((candidate) => candidate.roomId === position.roomId && board.activeCharacters[candidate.letter]?.gender === gender).length;

    hints.push({
      id: `char-gender-room-${position.letter}-${position.roomId}-${gender}-${count}`,
      type: "room_group_count",
      subject: { kind: "character", letter: position.letter },
      roomId: position.roomId,
      group: { kind: "gender", gender },
      countMode: "including_subject",
      count
    });
  }
}

function addGeneralRoomHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  for (const room of board.rooms) {
    const count = positions.filter((position) => position.roomId === room.id).length;

    if (count > 0) {
      hints.push({
        id: `room-person-count-${room.id}-${count}`,
        type: "room_person_count",
        roomId: room.id,
        count
      });
    }

    for (const gender of ["female", "male", "neutral"] as CharacterGender[]) {
      const genderCount = positions.filter((position) => position.roomId === room.id && board.activeCharacters[position.letter]?.gender === gender).length;

      if (genderCount > 0) {
        hints.push({
          id: `room-gender-count-${room.id}-${gender}-${genderCount}`,
          type: "room_group_count",
          roomId: room.id,
          group: { kind: "gender", gender },
          countMode: "total",
          count: genderCount
        });
      }
    }
  }
}

function addMurdererSupportHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  const murderer = board.murdererLetter ? positions.find((position) => position.letter === board.murdererLetter) : null;
  const victim = positions.find((position) => position.letter === "V");

  if (!murderer || !victim || !victim.roomId) {
    return;
  }

  hints.push({
    id: "victim-murderer-room",
    type: "murderer_room",
    victimLetter: "V"
  });
}

function hintPriority(board: BoardGrid, hint: Hint) {
  if (hint.type === "murderer_room") {
    return 0;
  }

  if (hint.type === "room_person_count") {
    return board.difficulty === "hard" ? 5 : 3;
  }

  if (hint.type === "room_group_count" && !hint.subject) {
    return board.difficulty === "hard" ? 6 : 4;
  }

  if (isNegativeRoomHint(hint)) {
    return board.difficulty === "hard" ? 8 : 99;
  }

  if (board.difficulty === "easy") {
    if (hint.type === "row_column") {
      return 1;
    }

    if (isPositiveRoomHint(hint)) {
      return 2;
    }

    if (hint.type === "edge") {
      return 3;
    }

    if (hint.type === "adjacent" || hint.type === "diagonal") {
      return 4;
    }

    if (hint.type === "distance" || hint.type === "direction") {
      return 5;
    }

    return 6;
  }

  if (board.difficulty === "hard") {
    if (hint.type === "distance" || hint.type === "direction") {
      return 1;
    }

    if (hint.type === "adjacent" || hint.type === "diagonal") {
      return 2;
    }

    if (hint.type === "room_group_count") {
      return 3;
    }

    if (hint.type === "edge") {
      return 4;
    }

    if (isPositiveRoomHint(hint)) {
      return 5;
    }

    if (hint.type === "row_column") {
      return 6;
    }

    return 7;
  }

  if (hint.type === "row_column") {
    return 1;
  }

  if (isPositiveRoomHint(hint)) {
    return 2;
  }

  if (hint.type === "adjacent" || hint.type === "diagonal") {
    return 3;
  }

  if (hint.type === "edge") {
    return 4;
  }

  if (hint.type === "distance" || hint.type === "direction") {
    return 5;
  }

  return 6;
}

function compareHintOptions(
  board: BoardGrid,
  current: HumanCandidateSolution[],
  beforePlacedCount: number,
  beforeDomainCount: number,
  a: { hint: Hint; filtered: HumanCandidateSolution[] },
  b: { hint: Hint; filtered: HumanCandidateSolution[] }
) {
  const aAnalysis = analyzeHumanSolve(board, a.filtered);
  const bAnalysis = analyzeHumanSolve(board, b.filtered);
  const aNewPlacements = aAnalysis.placedLetters.length - beforePlacedCount;
  const bNewPlacements = bAnalysis.placedLetters.length - beforePlacedCount;
  const aDomainReduction = beforeDomainCount - aAnalysis.totalDomainCount;
  const bDomainReduction = beforeDomainCount - bAnalysis.totalDomainCount;
  const aReduction = current.length - a.filtered.length;
  const bReduction = current.length - b.filtered.length;
  const aPriority = hintPriority(board, a.hint);
  const bPriority = hintPriority(board, b.hint);
  const aDirect = isDirectPlacementHint(a.hint);
  const bDirect = isDirectPlacementHint(b.hint);

  if (aNewPlacements !== bNewPlacements) {
    return bNewPlacements - aNewPlacements;
  }

  if (aDirect !== bDirect) {
    return aDirect ? -1 : 1;
  }

  if (a.filtered.length !== b.filtered.length) {
    return a.filtered.length - b.filtered.length;
  }

  if (aDomainReduction !== bDomainReduction) {
    return bDomainReduction - aDomainReduction;
  }

  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  if (aReduction !== bReduction) {
    return bReduction - aReduction;
  }

  return a.hint.id.localeCompare(b.hint.id);
}

function findBestHint(
  board: BoardGrid,
  current: HumanCandidateSolution[],
  hintCandidates: Hint[],
  usedHintIds: Set<string>,
  allowGeneral: boolean,
  onlyForLetter?: PlayLetter
) {
  const beforeAnalysis = analyzeHumanSolve(board, current);
  const options: Array<{ hint: Hint; filtered: HumanCandidateSolution[] }> = [];

  for (const hint of hintCandidates) {
    if (usedHintIds.has(hint.id)) {
      continue;
    }

    if (!allowGeneral && isGeneralHint(hint)) {
      continue;
    }

    if (onlyForLetter && !hintCoversLetter(hint, onlyForLetter)) {
      continue;
    }

    const filtered = filterCandidateSolutions(board, current, hint);

    if (filtered.length <= 0 || filtered.length > current.length) {
      continue;
    }

    const afterAnalysis = analyzeHumanSolve(board, filtered);
    const reducesSolutions = filtered.length < current.length;
    const improvesHumanFlow = afterAnalysis.placedLetters.length > beforeAnalysis.placedLetters.length || afterAnalysis.totalDomainCount < beforeAnalysis.totalDomainCount;

    if (!reducesSolutions && !improvesHumanFlow) {
      continue;
    }

    options.push({ hint, filtered });
  }

  return options.sort((a, b) => compareHintOptions(board, current, beforeAnalysis.placedLetters.length, beforeAnalysis.totalDomainCount, a, b))[0] ?? null;
}

function bestNonReducingHint(board: BoardGrid, letter: PlayLetter, hintCandidates: Hint[], usedHintIds: Set<string>) {
  const options = hintCandidates
    .filter((hint) => hintCoversLetter(hint, letter) && hint.type !== "murderer_room" && !usedHintIds.has(hint.id))
    .sort((a, b) => hintPriority(board, a) - hintPriority(board, b) || a.id.localeCompare(b.id));

  return options[0] ?? null;
}

function forceDirectHintsForLetter(
  board: BoardGrid,
  letter: PlayLetter,
  current: HumanCandidateSolution[],
  hintCandidates: Hint[],
  usedHintIds: Set<string>
) {
  const directHints = hintCandidates
    .filter((hint) => hintCoversLetter(hint, letter) && hint.type === "row_column" && !usedHintIds.has(hint.id))
    .sort((a, b) => hintPriority(board, a) - hintPriority(board, b) || a.id.localeCompare(b.id));

  const result: Array<{ hint: Hint; filtered: HumanCandidateSolution[] }> = [];
  let working = current;

  for (const hint of directHints) {
    const filtered = filterCandidateSolutions(board, working, hint);

    if (filtered.length <= 0 || filtered.length > working.length) {
      continue;
    }

    result.push({ hint, filtered });
    working = filtered;

    if (analyzeHumanSolve(board, working).placedLetters.includes(letter)) {
      break;
    }
  }

  return result;
}

function selectBetaHints(board: BoardGrid, hintCandidates: Hint[], baseCandidates: HumanCandidateSolution[]): HintSelectionResult {
  const selected: Hint[] = [];
  const usedLetters = new Set<PlayLetter>();
  const usedHintIds = new Set<string>();
  let currentCandidates = baseCandidates;
  let generalHintCount = 0;
  const generalHintLimit = getGeneralHintLimit(board);
  const maxHintCount = getMaxHintCount(board);
  const victimHint = hintCandidates.find((hint) => hint.type === "murderer_room" && hint.victimLetter === "V");

  function addHint(hint: Hint, filtered: HumanCandidateSolution[]) {
    selected.push(hint);
    usedHintIds.add(hint.id);
    currentCandidates = filtered;

    const letter = hintSubjectLetter(hint);
    if (letter) {
      usedLetters.add(letter);
    }

    if (isGeneralHint(hint)) {
      generalHintCount += 1;
    }
  }

  if (board.activeLetters.includes("V") && victimHint) {
    addHint(victimHint, filterCandidateSolutions(board, currentCandidates, victimHint));
  }

  for (const letter of board.activeLetters) {
    if (letter === "V") {
      continue;
    }

    if (analyzeHumanSolve(board, currentCandidates).placedLetters.includes(letter)) {
      continue;
    }

    const bestForLetter = findBestHint(board, currentCandidates, hintCandidates, usedHintIds, false, letter);

    if (bestForLetter) {
      addHint(bestForLetter.hint, bestForLetter.filtered);
      continue;
    }

    const forcedHints = forceDirectHintsForLetter(board, letter, currentCandidates, hintCandidates, usedHintIds);
    for (const forced of forcedHints) {
      if (selected.length >= maxHintCount) {
        break;
      }

      addHint(forced.hint, forced.filtered);
    }
  }

  while ((analyzeHumanSolve(board, currentCandidates).placedLetters.length < board.activeLetters.length || currentCandidates.length > 1) && selected.length < maxHintCount) {
    const allowGeneral = generalHintCount < generalHintLimit;
    const bestExtra = findBestHint(board, currentCandidates, hintCandidates, usedHintIds, allowGeneral);

    if (!bestExtra) {
      const unsolved = analyzeHumanSolve(board, currentCandidates).unsolvedLetters.find((letter) => letter !== "V");

      if (!unsolved) {
        break;
      }

      const forcedHints = forceDirectHintsForLetter(board, unsolved, currentCandidates, hintCandidates, usedHintIds);

      if (forcedHints.length === 0) {
        break;
      }

      for (const forced of forcedHints) {
        if (selected.length >= maxHintCount) {
          break;
        }

        addHint(forced.hint, forced.filtered);
      }

      continue;
    }

    addHint(bestExtra.hint, bestExtra.filtered);
  }

  const finalHumanSolve = analyzeHumanSolve(board, currentCandidates);

  if (currentCandidates.length === 1) {
    for (const letter of board.activeLetters) {
      if (usedLetters.has(letter)) {
        continue;
      }

      const fallbackHint = bestNonReducingHint(board, letter, hintCandidates, usedHintIds);

      if (!fallbackHint || selected.length >= maxHintCount) {
        return {
          ok: false,
          hints: selected,
          remainingSolutions: currentCandidates.length,
          humanPlacedCount: finalHumanSolve.placedLetters.length,
          message: `Er is geen aanvullende hint gevonden voor ${letter}.`
        };
      }

      selected.push(fallbackHint);
      usedLetters.add(letter);
      usedHintIds.add(fallbackHint.id);
    }
  }

  if (usedLetters.size !== board.activeLetters.length) {
    return {
      ok: false,
      hints: selected,
      remainingSolutions: currentCandidates.length,
      humanPlacedCount: finalHumanSolve.placedLetters.length,
      message: "Niet elk personage kreeg minimaal 1 hint."
    };
  }

  if (currentCandidates.length !== 1) {
    return {
      ok: false,
      hints: selected,
      remainingSolutions: currentCandidates.length,
      humanPlacedCount: finalHumanSolve.placedLetters.length,
      message: `Deze hintset laat nog ${currentCandidates.length} mogelijke oplossingen over.`
    };
  }

  if (finalHumanSolve.placedLetters.length !== board.activeLetters.length) {
    return {
      ok: false,
      hints: selected,
      remainingSolutions: currentCandidates.length,
      humanPlacedCount: finalHumanSolve.placedLetters.length,
      message: `De human solver kan ${finalHumanSolve.placedLetters.length} van ${board.activeLetters.length} personages plaatsen.`
    };
  }

  return {
    ok: true,
    hints: selected,
    remainingSolutions: currentCandidates.length,
    humanPlacedCount: finalHumanSolve.placedLetters.length
  };
}

export function generateHintCandidates(board: BoardGrid) {
  const positions = getSolutionPositions(board);
  const hints: Hint[] = [];

  if (!board.solution || positions.length === 0) {
    return hints;
  }

  addRoomHints(board, positions, hints);
  addRowColumnHints(positions, hints);
  addEdgeHints(board, positions, hints);
  addTargetHints(positions, getTargets(board), hints);
  addCharacterGenderRoomHints(board, positions, hints);
  addGeneralRoomHints(board, positions, hints);
  addMurdererSupportHints(board, positions, hints);

  return uniqueHints(hints);
}

export function generateBetaHints(board: BoardGrid): GenerateHintsResult {
  if (!board.solution) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: "Genereer eerst een oplossing voordat je hints maakt."
    };
  }

  const candidateResult = enumerateCandidateSolutions(board);

  if (candidateResult.candidates.length === 0) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: "De human solver kon geen geldige oplossingenset maken voor dit bord."
    };
  }

  const hintCandidates = generateHintCandidates(board);

  if (hintCandidates.length === 0) {
    return {
      ok: false,
      hints: [],
      candidateCount: candidateResult.candidates.length,
      message: "Er konden geen hints worden gemaakt op basis van deze oplossing."
    };
  }

  const selection = selectBetaHints(board, hintCandidates, candidateResult.candidates);

  if (!selection.ok) {
    return {
      ok: false,
      hints: [],
      candidateCount: candidateResult.candidates.length,
      message: `${selection.message} Maak extra kamers, objecten of obstakels en probeer opnieuw.`
    };
  }

  const cappedText = candidateResult.capped ? " binnen de beta-limiet" : "";
  const generalCount = selection.hints.filter((hint) => isGeneralHint(hint)).length;

  return {
    ok: true,
    hints: selection.hints,
    candidateCount: candidateResult.candidates.length,
    message: `${selection.hints.length} hints gegenereerd: de human solver plaatst ${selection.humanPlacedCount} personages, met ${generalCount} algemene hints. ${candidateResult.candidates.length} mogelijke oplossingen teruggebracht naar 1${cappedText}.`
  };
}
