import type { BoardCell, BoardGrid, CharacterGender, Hint, HintTarget, PlayLetter, SolutionPosition } from "../types/board";

type PositionedLetter = {
  letter: PlayLetter;
  row: number;
  col: number;
  roomId: string | null;
};

type TargetCell = {
  row: number;
  col: number;
  target: HintTarget;
};

type GenerateHintsResult =
  | {
      ok: true;
      hints: Hint[];
      candidateCount: number;
      message: string;
    }
  | {
      ok: false;
      hints: [];
      candidateCount: number;
      message: string;
    };

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const item = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = item;
  }

  return result;
}

function uniqueHints(hints: Hint[]) {
  const seen = new Set<string>();
  const result: Hint[] = [];

  for (const hint of hints) {
    const key = JSON.stringify(hint);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(hint);
  }

  return result;
}

function getCell(board: BoardGrid, row: number, col: number) {
  return board.cells.find((cell) => cell.row === row && cell.col === col) ?? null;
}

function getSolutionPositions(board: BoardGrid) {
  const solution = board.solution;

  if (!solution) {
    return [];
  }

  const result: PositionedLetter[] = [];

  for (const letter of board.activeLetters) {
    const position: SolutionPosition | undefined = solution[letter];

    if (!position) {
      continue;
    }

    const cell = getCell(board, position.row, position.col);

    result.push({
      letter,
      row: position.row,
      col: position.col,
      roomId: cell?.roomId ?? null
    });
  }

  return result;
}

function isCorner(board: BoardGrid, row: number, col: number) {
  return (row === 0 || row === board.rows - 1) && (col === 0 || col === board.cols - 1);
}

function isEdge(board: BoardGrid, row: number, col: number) {
  return row === 0 || col === 0 || row === board.rows - 1 || col === board.cols - 1;
}

function relationDistance(a: PositionedLetter, b: TargetCell) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function isAdjacent(a: PositionedLetter, b: TargetCell) {
  return relationDistance(a, b) === 1;
}

function isDiagonal(a: PositionedLetter, b: TargetCell) {
  return Math.abs(a.row - b.row) === 1 && Math.abs(a.col - b.col) === 1;
}

function getTargets(board: BoardGrid): TargetCell[] {
  const result: TargetCell[] = [];

  for (const cell of board.cells) {
    if (!cell.isActive) {
      continue;
    }

    if (cell.isObject && cell.objectType) {
      result.push({
        row: cell.row,
        col: cell.col,
        target: { kind: "object", objectType: cell.objectType }
      });
    }

    if (cell.isBlocked && cell.obstacleType) {
      result.push({
        row: cell.row,
        col: cell.col,
        target: { kind: "obstacle", obstacleType: cell.obstacleType }
      });
    }
  }

  return result;
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
  }

  for (const position of positions) {
    const otherRooms = board.rooms.filter((room) => room.id !== position.roomId);
    const room = shuffle(otherRooms)[0];

    if (!room) {
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

function addRowColumnHints(positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    const axis = position.letter.charCodeAt(0) % 2 === 0 ? "row" : "col";

    hints.push({
      id: `${axis}-${position.letter}`,
      type: "row_column",
      subject: { kind: "character", letter: position.letter },
      axis,
      index: axis === "row" ? position.row + 1 : position.col + 1,
      relation: "is"
    });
  }
}

function addEdgeHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  for (const position of positions) {
    if (isCorner(board, position.row, position.col)) {
      hints.push({
        id: `corner-${position.letter}`,
        type: "edge",
        subject: { kind: "character", letter: position.letter },
        edgeType: "corner",
        relation: "is"
      });
      continue;
    }

    if (isEdge(board, position.row, position.col)) {
      hints.push({
        id: `edge-${position.letter}`,
        type: "edge",
        subject: { kind: "character", letter: position.letter },
        edgeType: "any_edge",
        relation: "is"
      });
    } else {
      hints.push({
        id: `not-edge-${position.letter}`,
        type: "edge",
        subject: { kind: "character", letter: position.letter },
        edgeType: "any_edge",
        relation: "is_not"
      });
    }
  }
}

function addTargetHints(positions: PositionedLetter[], targets: TargetCell[], hints: Hint[]) {
  for (const position of positions) {
    const adjacentTarget = shuffle(targets.filter((target) => isAdjacent(position, target)))[0];

    if (adjacentTarget) {
      hints.push({
        id: `adjacent-${position.letter}-${adjacentTarget.row}-${adjacentTarget.col}`,
        type: "adjacent",
        subject: { kind: "character", letter: position.letter },
        target: adjacentTarget.target,
        relation: "is"
      });
    }

    const diagonalTarget = shuffle(targets.filter((target) => isDiagonal(position, target)))[0];

    if (diagonalTarget) {
      hints.push({
        id: `diagonal-${position.letter}-${diagonalTarget.row}-${diagonalTarget.col}`,
        type: "diagonal",
        subject: { kind: "character", letter: position.letter },
        target: diagonalTarget.target,
        relation: "is"
      });
    }

    const sameRowTarget = shuffle(targets.filter((target) => target.row === position.row && target.col !== position.col))[0];

    if (sameRowTarget) {
      hints.push({
        id: `same-row-distance-${position.letter}-${sameRowTarget.row}-${sameRowTarget.col}`,
        type: "distance",
        subject: { kind: "character", letter: position.letter },
        target: sameRowTarget.target,
        axis: "col",
        distance: Math.abs(position.col - sameRowTarget.col),
        relation: "exactly"
      });
    }

    const sameColTarget = shuffle(targets.filter((target) => target.col === position.col && target.row !== position.row))[0];

    if (sameColTarget) {
      hints.push({
        id: `same-col-distance-${position.letter}-${sameColTarget.row}-${sameColTarget.col}`,
        type: "distance",
        subject: { kind: "character", letter: position.letter },
        target: sameColTarget.target,
        axis: "row",
        distance: Math.abs(position.row - sameColTarget.row),
        relation: "exactly"
      });
    }

    const directionalTarget = shuffle(targets.filter((target) => target.row !== position.row || target.col !== position.col))[0];

    if (directionalTarget) {
      const rowDistance = Math.abs(position.row - directionalTarget.row);
      const colDistance = Math.abs(position.col - directionalTarget.col);
      const direction = rowDistance >= colDistance
        ? position.row < directionalTarget.row ? "above" : "below"
        : position.col < directionalTarget.col ? "left_of" : "right_of";

      hints.push({
        id: `direction-${position.letter}-${directionalTarget.row}-${directionalTarget.col}`,
        type: "direction",
        subject: { kind: "character", letter: position.letter },
        target: directionalTarget.target,
        direction,
        relation: "is"
      });
    }
  }
}

function addGenderRoomHints(board: BoardGrid, positions: PositionedLetter[], hints: Hint[]) {
  const genders: CharacterGender[] = ["female", "male", "neutral"];

  for (const room of board.rooms) {
    const lettersInRoom = positions.filter((position) => position.roomId === room.id).map((position) => position.letter);

    if (lettersInRoom.length === 0) {
      continue;
    }

    for (const gender of genders) {
      const count = lettersInRoom.filter((letter) => board.activeCharacters[letter]?.gender === gender).length;

      if (count <= 0) {
        continue;
      }

      hints.push({
        id: `gender-room-${room.id}-${gender}-${count}`,
        type: "room_group_count",
        roomId: room.id,
        group: { kind: "gender", gender },
        countMode: "total",
        count
      });
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
    id: `victim-room-${victim.roomId}`,
    type: "room",
    subject: { kind: "character", letter: "V" },
    roomId: victim.roomId,
    relation: "is_in"
  });

  const murdererGender = board.activeCharacters[murderer.letter]?.gender;

  if (murdererGender) {
    hints.push({
      id: `murderer-gender-count-${victim.roomId}-${murdererGender}`,
      type: "room_group_count",
      subject: { kind: "character", letter: "V" },
      roomId: victim.roomId,
      group: { kind: "gender", gender: murdererGender },
      countMode: "other_than_subject",
      count: positions.filter((position) => position.roomId === victim.roomId && position.letter !== "V" && board.activeCharacters[position.letter]?.gender === murdererGender).length
    });
  }
}

function selectHintTargetCount(board: BoardGrid) {
  if (board.difficulty === "easy") {
    return 8;
  }

  if (board.difficulty === "hard") {
    return 14;
  }

  return 11;
}

function selectBetaHints(board: BoardGrid, candidates: Hint[]) {
  const targetCount = Math.min(candidates.length, selectHintTargetCount(board));
  const requiredHints = candidates.filter((hint) => hint.id.startsWith("victim-room-") || hint.id.startsWith("murderer-gender-count-"));
  const softHints = candidates.filter((hint) => !requiredHints.includes(hint));
  const selected: Hint[] = [];

  for (const hint of requiredHints) {
    if (selected.length < targetCount) {
      selected.push(hint);
    }
  }

  const buckets = [
    softHints.filter((hint) => hint.type === "room"),
    softHints.filter((hint) => hint.type === "adjacent" || hint.type === "diagonal"),
    softHints.filter((hint) => hint.type === "edge"),
    softHints.filter((hint) => hint.type === "room_group_count"),
    softHints.filter((hint) => hint.type === "distance" || hint.type === "direction"),
    softHints.filter((hint) => hint.type === "row_column")
  ].map((bucket) => shuffle(bucket));

  while (selected.length < targetCount && buckets.some((bucket) => bucket.length > 0)) {
    for (const bucket of buckets) {
      const hint = bucket.shift();

      if (!hint || selected.length >= targetCount) {
        continue;
      }

      selected.push(hint);
    }
  }

  return selected;
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
  addGenderRoomHints(board, positions, hints);
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

  const candidates = generateHintCandidates(board);

  if (candidates.length === 0) {
    return {
      ok: false,
      hints: [],
      candidateCount: 0,
      message: "Er konden geen hints worden gemaakt op basis van deze oplossing."
    };
  }

  const hints = selectBetaHints(board, candidates);

  return {
    ok: true,
    hints,
    candidateCount: candidates.length,
    message: `${hints.length} hints gegenereerd uit ${candidates.length} mogelijke hints.`
  };
}
