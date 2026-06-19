import type {
  BoardCell,
  BoardGrid,
  BoardObjectTypeId,
  BoardObstacleTypeId,
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

type PartialBuildResult = {
  hints: Hint[];
  placedSuspects: Set<PlayLetter>;
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

function makeObjectTarget(cell: BoardCell): HintTarget | null {
  if (cell.isObject && cell.objectType) {
    return {
      kind: "object",
      objectType: cell.objectType,
      roomId: cell.roomId
    };
  }

  if (cell.isBlocked && cell.obstacleType) {
    return {
      kind: "obstacle",
      obstacleType: cell.obstacleType,
      roomId: cell.roomId
    };
  }

  return null;
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

function addRoomHint(hints: Hint[], letter: PlayLetter, roomId: string | null) {
  if (!roomId || letter === "V") {
    return;
  }

  addHint(hints, {
    id: `room-${letter}-${roomId}`,
    type: "room",
    subject: makeSubject(letter),
    roomId,
    relation: "is_in"
  });
}

function addRowHint(hints: Hint[], letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return;
  }

  addHint(hints, {
    id: `row-${letter}`,
    type: "row_column",
    subject: makeSubject(letter),
    axis: "row",
    index: position.row + 1,
    relation: "is"
  });
}

function addColHint(hints: Hint[], letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return;
  }

  addHint(hints, {
    id: `col-${letter}`,
    type: "row_column",
    subject: makeSubject(letter),
    axis: "col",
    index: position.col + 1,
    relation: "is"
  });
}

function addObjectPlacementHint(board: BoardGrid, hints: Hint[], letter: PlayLetter, position: SolutionPosition) {
  if (letter === "V") {
    return false;
  }

  const objectCells = board.cells.filter((cell) => (cell.isObject && cell.objectType) || (cell.isBlocked && cell.obstacleType));
  const adjacentTarget = objectCells.find((cell) => isAdjacent(position, { row: cell.row, col: cell.col }) && cell.roomId === getCellRoomId(board, position));

  if (adjacentTarget) {
    const target = makeObjectTarget(adjacentTarget);

    if (target) {
      addHint(hints, {
        id: `adjacent-${letter}-${adjacentTarget.row}-${adjacentTarget.col}`,
        type: "adjacent",
        subject: makeSubject(letter),
        target,
        relation: "is"
      });
      return true;
    }
  }

  const diagonalTarget = objectCells.find((cell) => isDiagonal(position, { row: cell.row, col: cell.col }) && cell.roomId === getCellRoomId(board, position));

  if (diagonalTarget) {
    const target = makeObjectTarget(diagonalTarget);

    if (target) {
      addHint(hints, {
        id: `diagonal-${letter}-${diagonalTarget.row}-${diagonalTarget.col}`,
        type: "diagonal",
        subject: makeSubject(letter),
        target,
        relation: "is"
      });
      return true;
    }
  }

  return false;
}

function addRoomCountHint(board: BoardGrid, hints: Hint[], roomId: string | null) {
  if (!roomId) {
    return;
  }

  const count = board.activeLetters.filter((letter) => {
    const position = getPosition(board.solution, letter);
    return getCellRoomId(board, position) === roomId;
  }).length;

  if (count <= 0) {
    return;
  }

  addHint(hints, {
    id: `room-person-count-${roomId}-${count}`,
    type: "room_person_count",
    roomId,
    count
  });
}

function addExactPlacementHints(board: BoardGrid, hints: Hint[], letter: PlayLetter) {
  const position = getPosition(board.solution, letter);
  const roomId = getCellRoomId(board, position);

  if (!position || !roomId || letter === "V") {
    return;
  }

  const objectAdded = addObjectPlacementHint(board, hints, letter, position);

  if (!objectAdded) {
    addRoomHint(hints, letter, roomId);
  }

  addRowHint(hints, letter, position);
  addColHint(hints, letter, position);
}

function inferVictimFromPlacedSuspects(board: BoardGrid, placed: Set<PlayLetter>) {
  if (placed.size !== getSuspectLetters(board).length) {
    return null;
  }

  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  for (const letter of placed) {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return null;
    }

    usedRows.add(position.row);
    usedCols.add(position.col);
  }

  const remainingRows = Array.from({ length: board.rows }, (_value, index) => index).filter((row) => !usedRows.has(row));
  const remainingCols = Array.from({ length: board.cols }, (_value, index) => index).filter((col) => !usedCols.has(col));

  if (remainingRows.length !== 1 || remainingCols.length !== 1) {
    return null;
  }

  const row = remainingRows[0];
  const col = remainingCols[0];

  if (row === undefined || col === undefined) {
    return null;
  }

  const cell = getCell(board, row, col);

  if (!isValidPersonCell(cell)) {
    return null;
  }

  return { row, col } satisfies SolutionPosition;
}

function validateBuild(board: BoardGrid, hints: Hint[], placedSuspects: Set<PlayLetter>) {
  const suspects = getSuspectLetters(board);
  const missing = suspects.filter((letter) => !placedSuspects.has(letter));

  if (missing.length > 0) {
    return { ok: false, message: `Niet alle verdachten zijn plaatsbaar. Mist: ${missing.join(", ")}.` };
  }

  if (hints.some((hint) => hintCoversLetter(hint, "V") && hint.type !== "murderer_room")) {
    return { ok: false, message: "Er staat een directe V-hint in de hintset." };
  }

  const victimPosition = inferVictimFromPlacedSuspects(board, placedSuspects);
  const trueVictimPosition = getPosition(board.solution, "V");

  if (!victimPosition || !trueVictimPosition || victimPosition.row !== trueVictimPosition.row || victimPosition.col !== trueVictimPosition.col) {
    return { ok: false, message: "V blijft niet logisch als laatste open plek over." };
  }

  const victimRoomId = getCellRoomId(board, victimPosition);
  const suspectsInVictimRoom = suspects.filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === victimRoomId);

  if (suspectsInVictimRoom.length !== 1) {
    return { ok: false, message: `Er staat niet precies 1 verdachte bij V. Kandidaten: ${suspectsInVictimRoom.join(", ") || "geen"}.` };
  }

  return { ok: true, message: "ok", murdererLetter: suspectsInVictimRoom[0] ?? null, victimPosition };
}

function buildDeductiveHints(board: BoardGrid): PartialBuildResult {
  const hints: Hint[] = [];
  const placedSuspects = new Set<PlayLetter>();
  const suspects = getSuspectLetters(board);
  const victimPosition = getPosition(board.solution, "V");
  const victimRoomId = getCellRoomId(board, victimPosition);

  addVictimRule(hints);

  for (const letter of suspects) {
    addExactPlacementHints(board, hints, letter);
    placedSuspects.add(letter);
  }

  if (victimRoomId) {
    addRoomCountHint(board, hints, victimRoomId);
  }

  return { hints: uniqueHints(hints), placedSuspects };
}

export function generateHintCandidates(board: BoardGrid) {
  const positions = getSolutionPositions(board);
  const hints: Hint[] = [];

  if (!board.solution || positions.length === 0) {
    return hints;
  }

  addVictimRule(hints);

  for (const position of positions) {
    if (position.letter === "V") {
      continue;
    }

    addRoomHint(hints, position.letter, position.roomId);
    addRowHint(hints, position.letter, { row: position.row, col: position.col });
    addColHint(hints, position.letter, { row: position.row, col: position.col });
    addObjectPlacementHint(board, hints, position.letter, { row: position.row, col: position.col });
  }

  for (const room of board.rooms) {
    addRoomCountHint(board, hints, room.id);
  }

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
  const validation = validateBuild(board, build.hints, build.placedSuspects);

  if (!validation.ok || !validation.murdererLetter || !validation.victimPosition) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: `${validation.message} Voeg duidelijkere kamers, objecten of obstakels toe en probeer opnieuw.`
    };
  }

  const victimRow = validation.victimPosition.row + 1;
  const victimCol = validation.victimPosition.col + 1;

  return {
    ok: true,
    hints: build.hints,
    candidateCount: 1,
    message: `${build.hints.length} deductieve hints gegenereerd. Alle verdachten worden geplaatst, V blijft over op rij ${victimRow}, kolom ${victimCol}. Moordenaar: ${validation.murdererLetter}.`
  };
}
