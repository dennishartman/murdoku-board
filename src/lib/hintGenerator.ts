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

type PartialBuildResult = {
  hints: Hint[];
  directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>;
  objectHintCount: number;
};

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
  if (!hints.some((candidate) => candidate.id === hint.id)) {
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

function directionForSameLine(position: SolutionPosition, target: SolutionPosition) {
  if (position.row === target.row) {
    return position.col < target.col ? "left_of" : "right_of";
  }

  if (position.col === target.col) {
    return position.row < target.row ? "above" : "below";
  }

  return null;
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

function validateHintQuality(board: BoardGrid, hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, objectHintCount: number) {
  if (hints.some((hint) => hintCoversLetter(hint, "V") && hint.type !== "murderer_room")) {
    return { ok: false, message: "Er staat een directe V-hint in de hintset." };
  }

  for (const hint of hints) {
    const directHint = getDirectHintKind(hint);

    if (!directHint) {
      continue;
    }

    const directHints = directHintsByLetter.get(directHint.letter) ?? new Set<DirectHintKind>();

    if (directHints.size > 1) {
      return { ok: false, message: `Er staan te veel directe plaatsingshints voor ${directHint.letter}.` };
    }
  }

  if (board.difficulty !== "hard" && hints.some(usesObstacleTarget)) {
    return { ok: false, message: "Obstakels mogen alleen als hintanker in de moeilijke versie worden gebruikt." };
  }

  const boardHasObjects = board.cells.some((cell) => cell.isObject && cell.objectType);

  if (boardHasObjects && objectHintCount === 0) {
    return { ok: false, message: "Er zijn objecten op het bord, maar geen bruikbare objecthints gevonden." };
  }

  const victimPosition = getPosition(board.solution, "V");

  if (!victimPosition || !isValidPersonCell(getCell(board, victimPosition.row, victimPosition.col))) {
    return { ok: false, message: "De slachtofferpositie is niet geldig." };
  }

  const victimRoomId = getCellRoomId(board, victimPosition);
  const suspectsInVictimRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === victimRoomId);

  if (suspectsInVictimRoom.length !== 1) {
    return { ok: false, message: `Er staat niet precies 1 verdachte bij V. Kandidaten: ${suspectsInVictimRoom.join(", ") || "geen"}.` };
  }

  return { ok: true, message: "ok", murdererLetter: suspectsInVictimRoom[0] ?? null, victimPosition };
}

function buildDeductiveHints(board: BoardGrid): PartialBuildResult {
  const hints: Hint[] = [];
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();
  const suspects = getSuspectLetters(board);
  const includeObstacles = board.difficulty === "hard";
  let objectHintCount = 0;

  addVictimRule(hints);
  addRoomCountHints(board, hints);

  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return;
    }

    const hasObjectHint = addObjectPlacementHint(board, hints, letter, position, includeObstacles);
    const hasRelativeHint = addRelativePersonHint(board, hints, letter, position);

    if (hasObjectHint) {
      objectHintCount += 1;
    }

    if (shouldAddDirectHint(board, index, hasObjectHint, hasRelativeHint)) {
      addPreferredDirectHint(board, hints, directHintsByLetter, letter, index);
    }
  });

  return { hints: uniqueHints(hints), directHintsByLetter, objectHintCount };
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
  const validation = validateHintQuality(board, build.hints, build.directHintsByLetter, build.objectHintCount);

  if (!validation.ok || !validation.murdererLetter || !validation.victimPosition) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: `${validation.message} Voeg duidelijkere kamers of objecten toe en probeer opnieuw.`
    };
  }

  return {
    ok: true,
    hints: build.hints,
    candidateCount: 1,
    message: `${build.hints.length} hints gegenereerd. Maximaal 1 directe plaatsingshint per persoon. Objecten en kamers worden actief gebruikt. De moordenaar blijft verborgen tot de puzzel is ingevuld.`
  };
}
