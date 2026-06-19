import type {
  BoardCell,
  BoardGrid,
  BoardSolution,
  Hint,
  HintSubject,
  HintTarget,
  PlayLetter,
  SolutionPosition
} from "../types/board";

type PositionedLetter = {
  letter: PlayLetter;
  row: number;
  col: number;
  roomId: string | null;
};

type GenerateHintsResult =
  | { ok: true; hints: Hint[]; candidateCount: number; message: string }
  | { ok: false; hints: []; candidateCount: number; message: string };

type DirectHintKind = "room" | "row" | "col";
type DirectionKind = "above" | "below" | "left_of" | "right_of";

type PartialBuildResult = {
  hints: Hint[];
};

type HintValidationResult =
  | { ok: true; message: string; murdererLetter: PlayLetter; victimPosition: SolutionPosition; solutionCount: number }
  | { ok: false; message: string; solutionCount: number };

type SolverAssignment = Partial<Record<PlayLetter, SolutionPosition>>;

const SOLUTION_LIMIT = 30;

function getSuspectLetters(board: BoardGrid) {
  return board.activeLetters.filter((letter) => letter !== "V") as PlayLetter[];
}

function getPosition(solution: BoardSolution | null, letter: PlayLetter) {
  return solution?.[letter] ?? null;
}

function getCell(board: BoardGrid, row: number, col: number) {
  return board.cells.find((cell) => cell.row === row && cell.col === col) ?? null;
}

function getCellRoomId(board: BoardGrid, position: SolutionPosition | null | undefined) {
  if (!position) {
    return null;
  }

  return getCell(board, position.row, position.col)?.roomId ?? null;
}

function isValidPersonCell(cell: BoardCell | null) {
  return Boolean(cell?.isActive && !cell.isBlocked && !cell.isObject && cell.roomId);
}

function isAdjacent(a: SolutionPosition, b: SolutionPosition) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function isDiagonal(a: SolutionPosition, b: SolutionPosition) {
  return Math.abs(a.row - b.row) === 1 && Math.abs(a.col - b.col) === 1;
}

function makeSubject(letter: PlayLetter): HintSubject {
  return { kind: "character", letter };
}

function makeCharacterTarget(letter: PlayLetter): HintTarget {
  return { kind: "character", letter };
}

function makeObjectTarget(cell: BoardCell, includeObstacles: boolean): HintTarget | null {
  if (cell.isObject && cell.objectType) {
    return {
      kind: "object",
      objectType: cell.objectType,
      roomId: cell.roomId
    };
  }

  if (includeObstacles && cell.isBlocked && cell.obstacleType) {
    return {
      kind: "obstacle",
      obstacleType: cell.obstacleType,
      roomId: cell.roomId
    };
  }

  return null;
}

function hintSubjectLetter(hint: Hint) {
  if (hint.type === "murderer_room") {
    return hint.victimLetter;
  }

  if (hint.type === "room_person_count") {
    return null;
  }

  if (hint.type === "room_group_count") {
    return hint.subject?.kind === "character" ? hint.subject.letter : null;
  }

  return hint.subject.kind === "character" ? hint.subject.letter : null;
}

function hintCoversLetter(hint: Hint, letter: PlayLetter) {
  return hintSubjectLetter(hint) === letter;
}

function hintKey(hint: Hint) {
  return JSON.stringify(hint);
}

function uniqueHints(hints: Hint[]) {
  const seen = new Set<string>();
  const result: Hint[] = [];

  for (const hint of hints) {
    const key = hintKey(hint);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(hint);
    }
  }

  return result;
}

function getSolutionPositions(board: BoardGrid) {
  const result: PositionedLetter[] = [];

  for (const letter of board.activeLetters) {
    const position = getPosition(board.solution, letter);

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

function findMurderer(board: BoardGrid) {
  const victimPosition = getPosition(board.solution, "V");
  const victimRoomId = getCellRoomId(board, victimPosition);

  if (!victimRoomId) {
    return null;
  }

  const suspectsInRoom = getSuspectLetters(board).filter((letter) => {
    const position = getPosition(board.solution, letter);
    return getCellRoomId(board, position) === victimRoomId;
  });

  return suspectsInRoom.length === 1 ? suspectsInRoom[0] ?? null : null;
}

function addHint(hints: Hint[], hint: Hint) {
  if (!hints.some((candidate) => hintKey(candidate) === hintKey(hint))) {
    hints.push(hint);
  }
}

function addVictimRule(hints: Hint[]) {
  addHint(hints, {
    id: "victim-murderer-room",
    type: "murderer_room",
    victimLetter: "V"
  });
}

function getDirectHintSet(directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, letter: PlayLetter) {
  const current = directHintsByLetter.get(letter);

  if (current) {
    return current;
  }

  const next = new Set<DirectHintKind>();
  directHintsByLetter.set(letter, next);
  return next;
}

function getDirectHintMap(hints: Hint[]) {
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();

  for (const hint of hints) {
    const directHint = getDirectHintKind(hint);

    if (!directHint) {
      continue;
    }

    getDirectHintSet(directHintsByLetter, directHint.letter).add(directHint.kind);
  }

  return directHintsByLetter;
}

function addRoomHint(hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, letter: PlayLetter, roomId: string | null) {
  if (!roomId || letter === "V") {
    return false;
  }

  const directHints = getDirectHintSet(directHintsByLetter, letter);

  if (directHints.size >= 1) {
    return false;
  }

  directHints.add("room");
  addHint(hints, {
    id: `room-${letter}-${roomId}`,
    type: "room",
    subject: makeSubject(letter),
    roomId,
    relation: "is_in"
  });

  return true;
}

function addRowHint(hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return false;
  }

  const directHints = getDirectHintSet(directHintsByLetter, letter);

  if (directHints.size >= 1) {
    return false;
  }

  directHints.add("row");
  addHint(hints, {
    id: `row-${letter}`,
    type: "row_column",
    subject: makeSubject(letter),
    axis: "row",
    index: position.row + 1,
    relation: "is"
  });

  return true;
}

function addColHint(hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return false;
  }

  const directHints = getDirectHintSet(directHintsByLetter, letter);

  if (directHints.size >= 1) {
    return false;
  }

  directHints.add("col");
  addHint(hints, {
    id: `col-${letter}`,
    type: "row_column",
    subject: makeSubject(letter),
    axis: "col",
    index: position.col + 1,
    relation: "is"
  });

  return true;
}

function addPreferredDirectHint(
  board: BoardGrid,
  hints: Hint[],
  directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>,
  letter: PlayLetter,
  directIndex: number
) {
  const position = getPosition(board.solution, letter);
  const roomId = getCellRoomId(board, position);

  if (!position || !roomId || letter === "V") {
    return false;
  }

  const order: DirectHintKind[] = directIndex % 3 === 0 ? ["room", "row", "col"] : directIndex % 3 === 1 ? ["row", "col", "room"] : ["col", "room", "row"];

  for (const kind of order) {
    if (kind === "room" && addRoomHint(hints, directHintsByLetter, letter, roomId)) {
      return true;
    }

    if (kind === "row" && addRowHint(hints, directHintsByLetter, letter, position)) {
      return true;
    }

    if (kind === "col" && addColHint(hints, directHintsByLetter, letter, position)) {
      return true;
    }
  }

  return false;
}

function getAnchorCells(board: BoardGrid, includeObstacles: boolean) {
  return board.cells.filter((cell) => {
    if (cell.isObject && cell.objectType) {
      return true;
    }

    return includeObstacles && cell.isBlocked && cell.obstacleType;
  });
}

function sortAnchorsByDistance(position: SolutionPosition, anchors: BoardCell[]) {
  return [...anchors].sort((a, b) => Math.abs(position.row - a.row) + Math.abs(position.col - a.col) - (Math.abs(position.row - b.row) + Math.abs(position.col - b.col)));
}

function directionForSameLine(position: SolutionPosition, target: SolutionPosition): DirectionKind | null {
  if (position.row === target.row) {
    return position.col < target.col ? "left_of" : "right_of";
  }

  if (position.col === target.col) {
    return position.row < target.row ? "above" : "below";
  }

  return null;
}

function relationMatchesPosition(type: "adjacent" | "diagonal" | "direction", position: SolutionPosition, target: SolutionPosition, direction?: DirectionKind) {
  if (type === "adjacent") {
    return isAdjacent(position, target);
  }

  if (type === "diagonal") {
    return isDiagonal(position, target);
  }

  if (direction === "left_of") {
    return position.row === target.row && position.col < target.col;
  }

  if (direction === "right_of") {
    return position.row === target.row && position.col > target.col;
  }

  if (direction === "above") {
    return position.col === target.col && position.row < target.row;
  }

  if (direction === "below") {
    return position.col === target.col && position.row > target.row;
  }

  return false;
}

function addObjectPlacementHint(board: BoardGrid, hints: Hint[], letter: PlayLetter, position: SolutionPosition, includeObstacles: boolean) {
  if (letter === "V") {
    return false;
  }

  const roomId = getCellRoomId(board, position);
  const anchors = sortAnchorsByDistance(position, getAnchorCells(board, includeObstacles));

  for (const anchor of anchors) {
    if (anchor.roomId !== roomId) {
      continue;
    }

    const target = makeObjectTarget(anchor, includeObstacles);

    if (!target) {
      continue;
    }

    const targetPosition = { row: anchor.row, col: anchor.col };

    if (isAdjacent(position, targetPosition)) {
      addHint(hints, {
        id: `adjacent-${letter}-${anchor.row}-${anchor.col}`,
        type: "adjacent",
        subject: makeSubject(letter),
        target,
        relation: "is"
      });
      return true;
    }

    if (isDiagonal(position, targetPosition)) {
      addHint(hints, {
        id: `diagonal-${letter}-${anchor.row}-${anchor.col}`,
        type: "diagonal",
        subject: makeSubject(letter),
        target,
        relation: "is"
      });
      return true;
    }
  }

  for (const anchor of anchors) {
    const target = makeObjectTarget(anchor, includeObstacles);
    const direction = directionForSameLine(position, { row: anchor.row, col: anchor.col });

    if (!target || !direction) {
      continue;
    }

    addHint(hints, {
      id: `direction-${letter}-${direction}-${anchor.row}-${anchor.col}`,
      type: "direction",
      subject: makeSubject(letter),
      target,
      direction,
      relation: "is"
    });
    return true;
  }

  return false;
}

function addRoomCountHint(board: BoardGrid, hints: Hint[], roomId: string | null) {
  if (!roomId) {
    return false;
  }

  const count = board.activeLetters.filter((letter) => {
    const position = getPosition(board.solution, letter);
    return getCellRoomId(board, position) === roomId;
  }).length;

  if (count <= 0) {
    return false;
  }

  addHint(hints, {
    id: `room-person-count-${roomId}-${count}`,
    type: "room_person_count",
    roomId,
    count
  });

  return true;
}

function addRoomCountHints(board: BoardGrid, hints: Hint[]) {
  const victimPosition = getPosition(board.solution, "V");
  const victimRoomId = getCellRoomId(board, victimPosition);
  const occupiedRoomIds = board.rooms
    .map((room) => room.id)
    .filter((roomId) => board.activeLetters.some((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === roomId));
  const orderedRoomIds = [victimRoomId, ...occupiedRoomIds].filter((roomId, index, values): roomId is string => Boolean(roomId) && values.indexOf(roomId) === index);
  const maxRoomHints = board.difficulty === "easy" ? 4 : board.difficulty === "normal" ? 3 : 2;

  for (const roomId of orderedRoomIds.slice(0, maxRoomHints)) {
    addRoomCountHint(board, hints, roomId);
  }
}

function addRelativePersonHint(board: BoardGrid, hints: Hint[], letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return false;
  }

  const targets = getSuspectLetters(board)
    .filter((targetLetter) => targetLetter !== letter)
    .map((targetLetter) => ({ letter: targetLetter, position: getPosition(board.solution, targetLetter) }))
    .filter((entry): entry is { letter: PlayLetter; position: SolutionPosition } => Boolean(entry.position));

  const adjacentTarget = targets.find((entry) => isAdjacent(position, entry.position));

  if (adjacentTarget) {
    addHint(hints, {
      id: `person-adjacent-${letter}-${adjacentTarget.letter}`,
      type: "adjacent",
      subject: makeSubject(letter),
      target: makeCharacterTarget(adjacentTarget.letter),
      relation: "is"
    });
    return true;
  }

  const diagonalTarget = targets.find((entry) => isDiagonal(position, entry.position));

  if (diagonalTarget) {
    addHint(hints, {
      id: `person-diagonal-${letter}-${diagonalTarget.letter}`,
      type: "diagonal",
      subject: makeSubject(letter),
      target: makeCharacterTarget(diagonalTarget.letter),
      relation: "is"
    });
    return true;
  }

  const lineTarget = targets.find((entry) => directionForSameLine(position, entry.position));

  if (lineTarget) {
    const direction = directionForSameLine(position, lineTarget.position);

    if (direction) {
      addHint(hints, {
        id: `person-direction-${letter}-${lineTarget.letter}-${direction}`,
        type: "direction",
        subject: makeSubject(letter),
        target: makeCharacterTarget(lineTarget.letter),
        direction,
        relation: "is"
      });
      return true;
    }
  }

  return false;
}

function shouldAddDirectHint(board: BoardGrid, suspectIndex: number, hasObjectHint: boolean, hasRelativeHint: boolean) {
  if (board.difficulty === "easy") {
    return true;
  }

  if (board.difficulty === "normal") {
    return suspectIndex % 2 === 0 || (!hasObjectHint && !hasRelativeHint);
  }

  return suspectIndex === 0 || (!hasObjectHint && !hasRelativeHint);
}

function getDirectHintKind(hint: Hint): { letter: PlayLetter; kind: DirectHintKind } | null {
  if (hint.type === "room" && hint.relation === "is_in" && hint.subject.kind === "character") {
    return { letter: hint.subject.letter, kind: "room" };
  }

  if (hint.type === "row_column" && hint.relation === "is" && hint.subject.kind === "character") {
    return { letter: hint.subject.letter, kind: hint.axis === "row" ? "row" : "col" };
  }

  return null;
}

function hintTarget(hint: Hint): HintTarget | null {
  if (hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "distance" || hint.type === "direction") {
    return hint.target;
  }

  return null;
}

function usesObstacleTarget(hint: Hint) {
  return hintTarget(hint)?.kind === "obstacle";
}

function usesObjectTarget(hint: Hint) {
  return hintTarget(hint)?.kind === "object";
}

function getValidCells(board: BoardGrid) {
  return board.cells.filter(isValidPersonCell).map((cell) => ({ row: cell.row, col: cell.col }));
}

function targetMatchesCell(target: HintTarget, cell: BoardCell) {
  if (target.kind === "object") {
    return cell.isObject && Boolean(cell.objectType) && (!target.objectType || cell.objectType === target.objectType) && (!target.roomId || cell.roomId === target.roomId);
  }

  if (target.kind === "obstacle") {
    return cell.isBlocked && Boolean(cell.obstacleType) && (!target.obstacleType || cell.obstacleType === target.obstacleType) && (!target.roomId || cell.roomId === target.roomId);
  }

  return false;
}

function getTargetCells(board: BoardGrid, target: HintTarget) {
  if (target.kind !== "object" && target.kind !== "obstacle") {
    return [];
  }

  return board.cells.filter((cell) => targetMatchesCell(target, cell));
}

function relationToTargetCells(board: BoardGrid, type: "adjacent" | "diagonal" | "direction", position: SolutionPosition, target: HintTarget, direction?: DirectionKind) {
  const targetCells = getTargetCells(board, target);

  return targetCells.some((cell) => relationMatchesPosition(type, position, { row: cell.row, col: cell.col }, direction));
}

function filterDomainByHint(board: BoardGrid, letter: PlayLetter, domain: SolutionPosition[], hint: Hint) {
  if (hint.type === "row_column" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const value = hint.axis === "row" ? position.row + 1 : position.col + 1;
      return hint.relation === "is" ? value === hint.index : value !== hint.index;
    });
  }

  if (hint.type === "room" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const roomId = getCellRoomId(board, position);
      return hint.relation === "is_in" ? roomId === hint.roomId : roomId !== hint.roomId;
    });
  }

  if (hint.type === "edge" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const isTop = position.row === 0;
      const isBottom = position.row === board.rows - 1;
      const isLeft = position.col === 0;
      const isRight = position.col === board.cols - 1;
      const isMatch = hint.edgeType === "top" ? isTop : hint.edgeType === "bottom" ? isBottom : hint.edgeType === "left" ? isLeft : hint.edgeType === "right" ? isRight : hint.edgeType === "corner" ? (isTop || isBottom) && (isLeft || isRight) : isTop || isBottom || isLeft || isRight;
      return hint.relation === "is" ? isMatch : !isMatch;
    });
  }

  if ((hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") && hint.subject.kind === "character" && hint.subject.letter === letter && (hint.target.kind === "object" || hint.target.kind === "obstacle")) {
    return domain.filter((position) => {
      const isMatch = relationToTargetCells(board, hint.type, position, hint.target, hint.type === "direction" ? hint.direction : undefined);
      return hint.relation === "is" ? isMatch : !isMatch;
    });
  }

  return domain;
}

function createInitialDomains(board: BoardGrid, hints: Hint[]) {
  const validCells = getValidCells(board);
  const domains = new Map<PlayLetter, SolutionPosition[]>();

  for (const letter of board.activeLetters) {
    let domain = [...validCells];

    for (const hint of hints) {
      domain = filterDomainByHint(board, letter, domain, hint);
    }

    domains.set(letter, domain);
  }

  return domains;
}

function getAssignedPosition(assignment: SolverAssignment, letter: PlayLetter) {
  return assignment[letter] ?? null;
}

function evaluateBinaryHint(board: BoardGrid, hint: Hint, assignment: SolverAssignment) {
  if ((hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") && hint.subject.kind === "character" && hint.target.kind === "character") {
    const subjectPosition = getAssignedPosition(assignment, hint.subject.letter);
    const targetPosition = getAssignedPosition(assignment, hint.target.letter);

    if (!subjectPosition || !targetPosition) {
      return true;
    }

    const isMatch = relationMatchesPosition(hint.type, subjectPosition, targetPosition, hint.type === "direction" ? hint.direction : undefined);
    return hint.relation === "is" ? isMatch : !isMatch;
  }

  return true;
}

function evaluateFinalHint(board: BoardGrid, hint: Hint, assignment: SolverAssignment) {
  if (hint.type === "murderer_room") {
    const victimPosition = getAssignedPosition(assignment, hint.victimLetter);
    const victimRoomId = getCellRoomId(board, victimPosition);

    if (!victimRoomId) {
      return false;
    }

    const suspectsInRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getAssignedPosition(assignment, letter)) === victimRoomId);
    return suspectsInRoom.length === 1;
  }

  if (hint.type === "room_person_count") {
    const count = board.activeLetters.filter((letter) => getCellRoomId(board, getAssignedPosition(assignment, letter)) === hint.roomId).length;
    return count === hint.count;
  }

  if (hint.type === "room_group_count") {
    const count = board.activeLetters.filter((letter) => {
      const character = board.activeCharacters[letter];
      const position = getAssignedPosition(assignment, letter);
      return character?.gender === hint.group.gender && getCellRoomId(board, position) === hint.roomId;
    }).length;

    return count === hint.count;
  }

  if ((hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") && hint.subject.kind === "character" && hint.target.kind === "character") {
    return evaluateBinaryHint(board, hint, assignment);
  }

  return true;
}

function partialAssignmentIsValid(board: BoardGrid, hints: Hint[], assignment: SolverAssignment) {
  return hints.every((hint) => evaluateBinaryHint(board, hint, assignment));
}

function countSolutions(board: BoardGrid, hints: Hint[], limit = SOLUTION_LIMIT) {
  const domains = createInitialDomains(board, hints);

  if (board.activeLetters.some((letter) => (domains.get(letter)?.length ?? 0) === 0)) {
    return 0;
  }

  const orderedLetters = [...board.activeLetters].sort((a, b) => (domains.get(a)?.length ?? 0) - (domains.get(b)?.length ?? 0));
  const assignment: SolverAssignment = {};
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const usedCells = new Set<string>();
  let solutionCount = 0;

  function search(index: number) {
    if (solutionCount >= limit) {
      return;
    }

    if (index >= orderedLetters.length) {
      if (hints.every((hint) => evaluateFinalHint(board, hint, assignment))) {
        solutionCount += 1;
      }
      return;
    }

    const letter = orderedLetters[index];
    const domain = domains.get(letter) ?? [];

    for (const position of domain) {
      const cellKey = `${position.row}:${position.col}`;

      if (usedRows.has(position.row) || usedCols.has(position.col) || usedCells.has(cellKey)) {
        continue;
      }

      assignment[letter] = position;
      usedRows.add(position.row);
      usedCols.add(position.col);
      usedCells.add(cellKey);

      if (partialAssignmentIsValid(board, hints, assignment)) {
        search(index + 1);
      }

      delete assignment[letter];
      usedRows.delete(position.row);
      usedCols.delete(position.col);
      usedCells.delete(cellKey);

      if (solutionCount >= limit) {
        return;
      }
    }
  }

  search(0);
  return solutionCount;
}

function addCandidate(candidates: Hint[], hint: Hint, existingKeys: Set<string>) {
  const key = hintKey(hint);

  if (!existingKeys.has(key) && !candidates.some((candidate) => hintKey(candidate) === key)) {
    candidates.push(hint);
  }
}

function addObjectCandidates(board: BoardGrid, candidates: Hint[], existingKeys: Set<string>, letter: PlayLetter, position: SolutionPosition, includeObstacles: boolean) {
  for (const anchor of getAnchorCells(board, includeObstacles)) {
    const target = makeObjectTarget(anchor, includeObstacles);

    if (!target) {
      continue;
    }

    const targetPosition = { row: anchor.row, col: anchor.col };

    if (isAdjacent(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-adjacent-${letter}-${anchor.row}-${anchor.col}`, type: "adjacent", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    if (isDiagonal(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-diagonal-${letter}-${anchor.row}-${anchor.col}`, type: "diagonal", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    const direction = directionForSameLine(position, targetPosition);

    if (direction) {
      addCandidate(candidates, { id: `candidate-direction-${letter}-${direction}-${anchor.row}-${anchor.col}`, type: "direction", subject: makeSubject(letter), target, direction, relation: "is" }, existingKeys);
    }
  }
}

function addPersonRelationCandidates(board: BoardGrid, candidates: Hint[], existingKeys: Set<string>, letter: PlayLetter, position: SolutionPosition) {
  for (const targetLetter of getSuspectLetters(board)) {
    if (targetLetter === letter) {
      continue;
    }

    const targetPosition = getPosition(board.solution, targetLetter);

    if (!targetPosition) {
      continue;
    }

    const target = makeCharacterTarget(targetLetter);

    if (isAdjacent(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-person-adjacent-${letter}-${targetLetter}`, type: "adjacent", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    if (isDiagonal(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-person-diagonal-${letter}-${targetLetter}`, type: "diagonal", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    const direction = directionForSameLine(position, targetPosition);

    if (direction) {
      addCandidate(candidates, { id: `candidate-person-direction-${letter}-${targetLetter}-${direction}`, type: "direction", subject: makeSubject(letter), target, direction, relation: "is" }, existingKeys);
    }
  }
}

function addNegativeCandidates(board: BoardGrid, candidates: Hint[], existingKeys: Set<string>, letter: PlayLetter, position: SolutionPosition) {
  for (let row = 0; row < board.rows; row += 1) {
    if (row !== position.row) {
      addCandidate(candidates, { id: `candidate-not-row-${letter}-${row}`, type: "row_column", subject: makeSubject(letter), axis: "row", index: row + 1, relation: "is_not" }, existingKeys);
    }
  }

  for (let col = 0; col < board.cols; col += 1) {
    if (col !== position.col) {
      addCandidate(candidates, { id: `candidate-not-col-${letter}-${col}`, type: "row_column", subject: makeSubject(letter), axis: "col", index: col + 1, relation: "is_not" }, existingKeys);
    }
  }

  const roomId = getCellRoomId(board, position);

  for (const room of board.rooms) {
    if (room.id !== roomId) {
      addCandidate(candidates, { id: `candidate-not-room-${letter}-${room.id}`, type: "room", subject: makeSubject(letter), roomId: room.id, relation: "is_not_in" }, existingKeys);
    }
  }
}

function generateAdditionalHintCandidates(board: BoardGrid, hints: Hint[]) {
  const candidates: Hint[] = [];
  const existingKeys = new Set(hints.map(hintKey));
  const directHintsByLetter = getDirectHintMap(hints);
  const includeObstacles = board.difficulty === "hard";

  for (const letter of getSuspectLetters(board)) {
    const position = getPosition(board.solution, letter);
    const roomId = getCellRoomId(board, position);

    if (!position || !roomId) {
      continue;
    }

    addObjectCandidates(board, candidates, existingKeys, letter, position, includeObstacles);
    addPersonRelationCandidates(board, candidates, existingKeys, letter, position);

    if ((directHintsByLetter.get(letter)?.size ?? 0) === 0) {
      addCandidate(candidates, { id: `candidate-room-${letter}-${roomId}`, type: "room", subject: makeSubject(letter), roomId, relation: "is_in" }, existingKeys);
      addCandidate(candidates, { id: `candidate-row-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "row", index: position.row + 1, relation: "is" }, existingKeys);
      addCandidate(candidates, { id: `candidate-col-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "col", index: position.col + 1, relation: "is" }, existingKeys);
    }

    addNegativeCandidates(board, candidates, existingKeys, letter, position);
  }

  return candidates;
}

function hintPriority(hint: Hint) {
  if (usesObjectTarget(hint)) {
    return 0;
  }

  if (hintTarget(hint)?.kind === "character") {
    return 1;
  }

  if (hint.type === "room_person_count") {
    return 2;
  }

  if (hint.type === "row_column" && hint.relation === "is_not") {
    return 3;
  }

  if (hint.type === "room" && hint.relation === "is_not_in") {
    return 3;
  }

  return 4;
}

function improveHintSetUntilUnique(board: BoardGrid, baseHints: Hint[]) {
  let hints = uniqueHints(baseHints);
  let solutionCount = countSolutions(board, hints, SOLUTION_LIMIT);
  const maxExtraHints = board.difficulty === "easy" ? 10 : board.difficulty === "normal" ? 8 : 6;

  for (let attempt = 0; attempt < maxExtraHints && solutionCount !== 1; attempt += 1) {
    const candidates = generateAdditionalHintCandidates(board, hints);
    let bestHint: Hint | null = null;
    let bestCount = solutionCount;
    let bestPriority = Number.MAX_SAFE_INTEGER;

    for (const candidate of candidates) {
      const nextHints = uniqueHints([...hints, candidate]);
      const nextCount = countSolutions(board, nextHints, SOLUTION_LIMIT);
      const priority = hintPriority(candidate);

      if (nextCount > 0 && nextCount < bestCount) {
        bestHint = candidate;
        bestCount = nextCount;
        bestPriority = priority;
      } else if (nextCount > 0 && nextCount === bestCount && priority < bestPriority) {
        bestHint = candidate;
        bestCount = nextCount;
        bestPriority = priority;
      }

      if (bestCount === 1 && bestPriority === 0) {
        break;
      }
    }

    if (!bestHint || bestCount >= solutionCount) {
      break;
    }

    hints = uniqueHints([...hints, bestHint]);
    solutionCount = bestCount;
  }

  return { hints, solutionCount };
}

function validateHintQuality(board: BoardGrid, hints: Hint[]): HintValidationResult {
  if (hints.some((hint) => hintCoversLetter(hint, "V") && hint.type !== "murderer_room")) {
    return { ok: false, message: "Er staat een directe V-hint in de hintset.", solutionCount: 0 };
  }

  const directHintsByLetter = getDirectHintMap(hints);

  for (const [letter, directHints] of directHintsByLetter.entries()) {
    if (directHints.size > 1) {
      return { ok: false, message: `Er staan te veel directe plaatsingshints voor ${letter}.`, solutionCount: 0 };
    }
  }

  if (board.difficulty !== "hard" && hints.some(usesObstacleTarget)) {
    return { ok: false, message: "Obstakels mogen alleen als hintanker in de moeilijke versie worden gebruikt.", solutionCount: 0 };
  }

  const boardHasObjects = board.cells.some((cell) => cell.isObject && cell.objectType);

  if (boardHasObjects && !hints.some(usesObjectTarget)) {
    return { ok: false, message: "Er zijn objecten op het bord, maar geen bruikbare objecthints gevonden.", solutionCount: 0 };
  }

  const victimPosition = getPosition(board.solution, "V");

  if (!victimPosition || !isValidPersonCell(getCell(board, victimPosition.row, victimPosition.col))) {
    return { ok: false, message: "De slachtofferpositie is niet geldig.", solutionCount: 0 };
  }

  const victimRoomId = getCellRoomId(board, victimPosition);
  const suspectsInVictimRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === victimRoomId);

  if (suspectsInVictimRoom.length !== 1) {
    return { ok: false, message: `Er staat niet precies 1 verdachte bij V. Kandidaten: ${suspectsInVictimRoom.join(", ") || "geen"}.`, solutionCount: 0 };
  }

  const solutionCount = countSolutions(board, hints, 2);

  if (solutionCount !== 1) {
    return { ok: false, message: solutionCount === 0 ? "De hintset heeft geen geldige oplossing." : "De hintset heeft nog meerdere oplossingen.", solutionCount };
  }

  return { ok: true, message: "ok", murdererLetter: suspectsInVictimRoom[0] ?? "A", victimPosition, solutionCount };
}

function buildDeductiveHints(board: BoardGrid): PartialBuildResult {
  const hints: Hint[] = [];
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();
  const suspects = getSuspectLetters(board);
  const includeObstacles = board.difficulty === "hard";

  addVictimRule(hints);
  addRoomCountHints(board, hints);

  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return;
    }

    const hasObjectHint = addObjectPlacementHint(board, hints, letter, position, includeObstacles);
    const hasRelativeHint = addRelativePersonHint(board, hints, letter, position);

    if (shouldAddDirectHint(board, index, hasObjectHint, hasRelativeHint)) {
      addPreferredDirectHint(board, hints, directHintsByLetter, letter, index);
    }
  });

  return { hints: uniqueHints(hints) };
}

export function generateHintCandidates(board: BoardGrid) {
  const positions = getSolutionPositions(board);
  const hints: Hint[] = [];
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();
  const includeObstacles = board.difficulty === "hard";

  if (!board.solution || positions.length === 0) {
    return hints;
  }

  addVictimRule(hints);
  addRoomCountHints(board, hints);

  positions.forEach((position, index) => {
    if (position.letter === "V") {
      return;
    }

    const solutionPosition = { row: position.row, col: position.col };
    addObjectPlacementHint(board, hints, position.letter, solutionPosition, includeObstacles);
    addRelativePersonHint(board, hints, position.letter, solutionPosition);
    addPreferredDirectHint(board, hints, directHintsByLetter, position.letter, index);
  });

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

  const murdererLetter = findMurderer(board);

  if (!murdererLetter) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: "Er staat niet precies 1 verdachte bij V. Genereer een nieuwe oplossing."
    };
  }

  const build = buildDeductiveHints(board);
  const improved = improveHintSetUntilUnique(board, build.hints);
  const validation = validateHintQuality(board, improved.hints);

  if (!validation.ok) {
    return {
      ok: false,
      hints: [],
      candidateCount: validation.solutionCount,
      message: `${validation.message} De generator heeft extra hints geprobeerd, maar kon nog geen unieke puzzel maken. Pas kamers of objecten aan en probeer opnieuw.`
    };
  }

  return {
    ok: true,
    hints: improved.hints,
    candidateCount: 1,
    message: `${improved.hints.length} hints gegenereerd en intern gevalideerd. De speler heeft nu precies 1 oplossing en de moordenaar blijft verborgen tot de puzzel is ingevuld.`
  };
}
