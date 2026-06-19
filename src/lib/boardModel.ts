import { DEFAULT_THEME_ID, createActiveCharacterSet, ensureActiveCharacterSet, makeActiveLettersForCharacterCount } from "./characterPool";
import type { BoardCell, BoardGrid, BoardRoom, BuilderToolMode, EdgeSide, PlayLetter, PuzzleDifficulty } from "../types/board";

export const DEFAULT_ROOM_COLOR = "#e5e7eb";

export const ROOM_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7"
];

export const PLAY_LETTERS: PlayLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "V"];

export const DEFAULT_DIFFICULTY: PuzzleDifficulty = "normal";

const LETTER_SLOT_ORDER = [0, 2, 6, 8, 1, 5, 7, 3, 4];

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function makeEmptyMarks() {
  return Array.from({ length: 9 }, () => null as string | null);
}

function makeFinalCrossSource(row: number, col: number, letter: string) {
  return `final:${row}:${col}:${letter}`;
}

function uniqueSources(sources: string[]) {
  return Array.from(new Set(sources.filter((source) => typeof source === "string" && source.length > 0)));
}

function syncCellCross(cell: BoardCell) {
  cell.autoCrossSources = uniqueSources(cell.autoCrossSources ?? []);
  cell.isCrossed = cell.manualCross || cell.autoCrossSources.length > 0;
}

function makeCells(rows: number, cols: number): BoardCell[] {
  const cells: BoardCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        row,
        col,
        isActive: true,
        roomId: null,
        isBlocked: false,
        isObject: false,
        isCrossed: false,
        manualCross: false,
        autoCrossSources: [],
        finalLetter: null,
        playMarks: makeEmptyMarks()
      });
    }
  }

  return cells;
}

function makeVerticalWalls(rows: number, cols: number) {
  return Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, (_, col) => col === 0 || col === cols));
}

function makeHorizontalWalls(rows: number, cols: number) {
  return Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: cols }, () => row === 0 || row === rows));
}

function getSafeDifficulty(difficulty?: PuzzleDifficulty | null): PuzzleDifficulty {
  if (difficulty === "easy" || difficulty === "hard" || difficulty === "normal") {
    return difficulty;
  }

  return DEFAULT_DIFFICULTY;
}

function calculateMaxCharacters(rows: number, cols: number, cells: BoardCell[]) {
  const activeRows = new Set<number>();
  const activeCols = new Set<number>();
  let availableCells = 0;

  for (const cell of cells) {
    if (!cell.isActive || cell.isBlocked || cell.isObject) {
      continue;
    }

    availableCells += 1;
    activeRows.add(cell.row);
    activeCols.add(cell.col);
  }

  const rowCount = activeRows.size || rows;
  const colCount = activeCols.size || cols;
  return Math.max(1, Math.min(rowCount, colCount, availableCells || rows * cols, PLAY_LETTERS.length));
}

export function getCharacterCountForDifficulty(difficulty: PuzzleDifficulty, maxCharacters: number) {
  const max = Math.max(1, Math.min(PLAY_LETTERS.length, Math.floor(maxCharacters)));
  const minimum = Math.min(max, max >= 3 ? 3 : max);

  if (difficulty === "hard") {
    return max;
  }

  if (difficulty === "easy") {
    return Math.min(max, Math.max(minimum, Math.ceil(max * 0.65)));
  }

  return Math.min(max, Math.max(minimum, Math.ceil(max * 0.85)));
}

function calculateActiveLetters(rows: number, cols: number, cells: BoardCell[], difficulty: PuzzleDifficulty) {
  const maxCharacters = calculateMaxCharacters(rows, cols, cells);
  const characterCount = getCharacterCountForDifficulty(difficulty, maxCharacters);
  return makeActiveLettersForCharacterCount(characterCount);
}

function sanitizePlayLetters(board: BoardGrid) {
  const activeLetterSet = new Set(board.activeLetters);

  for (const cell of board.cells) {
    if (cell.finalLetter && !activeLetterSet.has(cell.finalLetter as PlayLetter)) {
      cell.finalLetter = null;
    }

    cell.playMarks = cell.playMarks.map((mark) => (mark && activeLetterSet.has(mark as PlayLetter) ? mark : null));
  }

  return board;
}

function isActivePlayLetter(board: BoardGrid, letter: string) {
  return board.activeLetters.includes(letter as PlayLetter);
}

export function getCell(board: BoardGrid, row: number, col: number) {
  return board.cells[row * board.cols + col];
}

export function normalizeBoard(board: BoardGrid): BoardGrid {
  const selectedThemeId = board.selectedThemeId ?? DEFAULT_THEME_ID;
  const difficulty = getSafeDifficulty(board.difficulty);
  const normalizedCells = board.cells.map((cell) => {
    const autoCrossSources = Array.isArray(cell.autoCrossSources) ? uniqueSources(cell.autoCrossSources) : [];
    const manualCross = typeof cell.manualCross === "boolean" ? cell.manualCross : cell.isCrossed ?? false;

    return {
      ...cell,
      isObject: cell.isObject ?? false,
      manualCross,
      autoCrossSources,
      isCrossed: manualCross || autoCrossSources.length > 0,
      finalLetter: cell.finalLetter ?? null,
      playMarks: Array.isArray(cell.playMarks) && cell.playMarks.length === 9 ? [...cell.playMarks] : makeEmptyMarks(),
      isBlocked: cell.isBlocked ?? false,
      isActive: cell.isActive ?? true,
      roomId: cell.roomId ?? null
    };
  });
  const maxCharacters = calculateMaxCharacters(board.rows, board.cols, normalizedCells);

  const normalizedBoard: BoardGrid = {
    ...board,
    selectedThemeId,
    difficulty,
    maxCharacters,
    activeLetters: calculateActiveLetters(board.rows, board.cols, normalizedCells, difficulty),
    activeCharacters: ensureActiveCharacterSet(selectedThemeId, board.activeCharacters),
    hints: Array.isArray(board.hints) ? [...board.hints] : [],
    cells: normalizedCells,
    rooms: (board.rooms ?? []).map((room) => ({ ...room, cells: room.cells.map(([row, col]) => [row, col] as [number, number]) })),
    verticalWalls: board.verticalWalls.map((line) => [...line]),
    horizontalWalls: board.horizontalWalls.map((line) => [...line])
  };

  return sanitizePlayLetters(normalizedBoard);
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return normalizeBoard(board);
}

function recalculateAutoCrosses(board: BoardGrid) {
  sanitizePlayLetters(board);

  for (const cell of board.cells) {
    cell.autoCrossSources = [];
  }

  const finalCells = board.cells.filter((cell) => cell.isActive && !cell.isBlocked && cell.finalLetter);

  for (const sourceCell of finalCells) {
    const source = makeFinalCrossSource(sourceCell.row, sourceCell.col, sourceCell.finalLetter as string);

    for (const targetCell of board.cells) {
      if (!targetCell.isActive || targetCell.isBlocked) {
        continue;
      }

      if (targetCell.row === sourceCell.row && targetCell.col === sourceCell.col) {
        continue;
      }

      if (targetCell.finalLetter) {
        continue;
      }

      if (targetCell.row === sourceCell.row || targetCell.col === sourceCell.col) {
        targetCell.autoCrossSources.push(source);
      }
    }
  }

  for (const cell of board.cells) {
    syncCellCross(cell);
  }

  return board;
}

export function createBoard(rows: number, cols: number, referenceImageUrl: string | null, difficulty: PuzzleDifficulty = DEFAULT_DIFFICULTY): BoardGrid {
  const selectedThemeId = DEFAULT_THEME_ID;
  const safeDifficulty = getSafeDifficulty(difficulty);
  const cells = makeCells(rows, cols);
  const maxCharacters = calculateMaxCharacters(rows, cols, cells);
  const activeLetters = calculateActiveLetters(rows, cols, cells, safeDifficulty);
  const board: BoardGrid = {
    rows,
    cols,
    cells,
    rooms: [],
    verticalWalls: makeVerticalWalls(rows, cols),
    horizontalWalls: makeHorizontalWalls(rows, cols),
    referenceImageUrl,
    selectedThemeId,
    difficulty: safeDifficulty,
    maxCharacters,
    activeLetters,
    activeCharacters: createActiveCharacterSet(selectedThemeId),
    hints: []
  };

  return recalculateRooms(board);
}

function oldRoomByCell(board: BoardGrid) {
  const result = new Map<string, string>();

  for (const room of board.rooms) {
    for (const [row, col] of room.cells) {
      result.set(cellKey(row, col), room.id);
    }
  }

  return result;
}

function oldRoomColor(board: BoardGrid) {
  const result = new Map<string, string>();

  for (const room of board.rooms) {
    result.set(room.id, room.color);
  }

  return result;
}

function canMove(board: BoardGrid, row: number, col: number, nextRow: number, nextCol: number) {
  if (nextRow < 0 || nextRow >= board.rows || nextCol < 0 || nextCol >= board.cols) {
    return false;
  }

  const nextCell = getCell(board, nextRow, nextCol);

  if (!nextCell.isActive) {
    return false;
  }

  if (nextRow === row && nextCol === col + 1) {
    return !board.verticalWalls[row][col + 1];
  }

  if (nextRow === row && nextCol === col - 1) {
    return !board.verticalWalls[row][col];
  }

  if (nextRow === row + 1 && nextCol === col) {
    return !board.horizontalWalls[row + 1][col];
  }

  if (nextRow === row - 1 && nextCol === col) {
    return !board.horizontalWalls[row][col];
  }

  return false;
}

export function recalculateRooms(input: BoardGrid): BoardGrid {
  const board = cloneBoard(input);
  const previousCellRooms = oldRoomByCell(input);
  const previousColors = oldRoomColor(input);
  const visited = new Set<string>();
  const rooms: BoardRoom[] = [];

  for (const cell of board.cells) {
    cell.roomId = null;
  }

  for (const start of board.cells) {
    if (!start.isActive) {
      continue;
    }

    const startKey = cellKey(start.row, start.col);

    if (visited.has(startKey)) {
      continue;
    }

    const queue: BoardCell[] = [start];
    const component: Array<[number, number]> = [];
    const oldRoomHits = new Map<string, number>();
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift() as BoardCell;
      component.push([current.row, current.col]);

      const oldRoomId = previousCellRooms.get(cellKey(current.row, current.col));
      if (oldRoomId) {
        oldRoomHits.set(oldRoomId, (oldRoomHits.get(oldRoomId) ?? 0) + 1);
      }

      const neighbors = [
        [current.row, current.col + 1],
        [current.row + 1, current.col],
        [current.row, current.col - 1],
        [current.row - 1, current.col]
      ];

      for (const [nextRow, nextCol] of neighbors) {
        const key = cellKey(nextRow, nextCol);

        if (visited.has(key)) {
          continue;
        }

        if (canMove(board, current.row, current.col, nextRow, nextCol)) {
          visited.add(key);
          queue.push(getCell(board, nextRow, nextCol));
        }
      }
    }

    let bestOldRoomId: string | null = null;
    let bestScore = 0;

    for (const [oldRoomId, score] of oldRoomHits) {
      if (score > bestScore) {
        bestScore = score;
        bestOldRoomId = oldRoomId;
      }
    }

    const id = `room-${rooms.length + 1}`;
    const color = bestOldRoomId ? previousColors.get(bestOldRoomId) ?? DEFAULT_ROOM_COLOR : DEFAULT_ROOM_COLOR;

    rooms.push({
      id,
      color,
      cells: component
    });
  }

  for (const room of rooms) {
    for (const [row, col] of room.cells) {
      getCell(board, row, col).roomId = room.id;
    }
  }

  board.rooms = rooms;
  board.maxCharacters = calculateMaxCharacters(board.rows, board.cols, board.cells);
  board.activeLetters = calculateActiveLetters(board.rows, board.cols, board.cells, board.difficulty);
  return recalculateAutoCrosses(board);
}

export function toggleCellActive(input: BoardGrid, row: number, col: number) {
  const board = cloneBoard(input);
  const cell = getCell(board, row, col);
  cell.isActive = !cell.isActive;
  cell.isBlocked = false;
  cell.isObject = false;
  cell.isCrossed = false;
  cell.manualCross = false;
  cell.autoCrossSources = [];
  cell.finalLetter = null;
  cell.playMarks = makeEmptyMarks();
  return recalculateRooms(board);
}

export function setEdgeBoundary(input: BoardGrid, row: number, col: number, side: EdgeSide, value: boolean) {
  const board = cloneBoard(input);

  if (side === "left" && col > 0) {
    board.verticalWalls[row][col] = value;
  }

  if (side === "right" && col < board.cols - 1) {
    board.verticalWalls[row][col + 1] = value;
  }

  if (side === "top" && row > 0) {
    board.horizontalWalls[row][col] = value;
  }

  if (side === "bottom" && row < board.rows - 1) {
    board.horizontalWalls[row + 1][col] = value;
  }

  return recalculateRooms(board);
}

export function setRoomColor(input: BoardGrid, roomId: string, color: string) {
  const board = cloneBoard(input);
  board.rooms = board.rooms.map((room) => (room.id === roomId ? { ...room, color } : room));
  return board;
}

export function applyBuilderTool(input: BoardGrid, row: number, col: number, tool: BuilderToolMode, color: string) {
  if (tool === "shape") {
    return toggleCellActive(input, row, col);
  }

  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive) {
    return board;
  }

  if (tool === "color" && cell.roomId) {
    return setRoomColor(board, cell.roomId, color);
  }

  if (tool === "object") {
    cell.isObject = !cell.isObject;
    if (cell.isObject) {
      cell.isBlocked = false;
    }
    return recalculateRooms(board);
  }

  if (tool === "blocked") {
    cell.isBlocked = !cell.isBlocked;
    if (cell.isBlocked) {
      cell.isObject = false;
    }
    cell.isCrossed = false;
    cell.manualCross = false;
    cell.autoCrossSources = [];
    cell.finalLetter = null;
    cell.playMarks = makeEmptyMarks();
    board.maxCharacters = calculateMaxCharacters(board.rows, board.cols, board.cells);
    board.activeLetters = calculateActiveLetters(board.rows, board.cols, board.cells, board.difficulty);
    return recalculateAutoCrosses(board);
  }

  return board;
}

export function toggleCellCross(input: BoardGrid, row: number, col: number) {
  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive || cell.isBlocked) {
    return board;
  }

  cell.manualCross = !cell.manualCross;
  syncCellCross(cell);
  return board;
}

export function clearCellPlay(input: BoardGrid, row: number, col: number) {
  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive || cell.isBlocked) {
    return board;
  }

  cell.manualCross = false;
  cell.autoCrossSources = [];
  cell.isCrossed = false;
  cell.finalLetter = null;
  cell.playMarks = makeEmptyMarks();
  return recalculateAutoCrosses(board);
}

export function toggleCellFinalLetter(input: BoardGrid, row: number, col: number, letter: string) {
  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive || cell.isBlocked || !isActivePlayLetter(board, letter)) {
    return board;
  }

  if (cell.finalLetter === letter) {
    cell.finalLetter = null;
    return recalculateAutoCrosses(board);
  }

  if (cell.isCrossed) {
    return board;
  }

  const letterAlreadyPlaced = board.cells.some((otherCell) => otherCell !== cell && otherCell.finalLetter === letter);

  if (letterAlreadyPlaced) {
    return board;
  }

  const rowOrColumnAlreadyHasFinal = board.cells.some(
    (otherCell) => otherCell !== cell && Boolean(otherCell.finalLetter) && (otherCell.row === row || otherCell.col === col)
  );

  if (rowOrColumnAlreadyHasFinal) {
    return board;
  }

  cell.manualCross = false;
  cell.autoCrossSources = [];
  cell.isCrossed = false;
  cell.finalLetter = letter;
  return recalculateAutoCrosses(board);
}

export function toggleCellLetter(input: BoardGrid, row: number, col: number, letter: string) {
  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive || cell.isBlocked || cell.isCrossed || !isActivePlayLetter(board, letter)) {
    return board;
  }

  const existingIndex = cell.playMarks.findIndex((mark) => mark === letter);

  if (existingIndex >= 0) {
    cell.playMarks[existingIndex] = null;
    return board;
  }

  const emptySlot = LETTER_SLOT_ORDER.find((slotIndex) => !cell.playMarks[slotIndex]);

  if (emptySlot === undefined) {
    return board;
  }

  cell.manualCross = false;
  syncCellCross(cell);
  cell.playMarks[emptySlot] = letter;
  return board;
}

export function hasBoundary(board: BoardGrid, row: number, col: number, side: EdgeSide) {
  if (side === "left") {
    if (col === 0) {
      return true;
    }
    return board.verticalWalls[row][col] || !getCell(board, row, col - 1).isActive;
  }

  if (side === "right") {
    if (col === board.cols - 1) {
      return true;
    }
    return board.verticalWalls[row][col + 1] || !getCell(board, row, col + 1).isActive;
  }

  if (side === "top") {
    if (row === 0) {
      return true;
    }
    return board.horizontalWalls[row][col] || !getCell(board, row - 1, col).isActive;
  }

  if (row === board.rows - 1) {
    return true;
  }

  return board.horizontalWalls[row + 1][col] || !getCell(board, row + 1, col).isActive;
}
