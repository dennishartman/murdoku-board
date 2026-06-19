import { DEFAULT_THEME_ID, createActiveCharacterSet, ensureActiveCharacterSet, makeActiveLettersForCharacterCount } from "./characterPool";
import { DETECTIVE_OBSTACLES, DETECTIVE_OBJECTS, getRoomDefinitionByIndex } from "./themeContent";
import type {
  BoardCell,
  BoardGrid,
  BoardObjectTypeId,
  BoardObstacleTypeId,
  BoardRoom,
  BuilderToolMode,
  EdgeSide,
  PlayLetter,
  PuzzleDifficulty
} from "../types/board";

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

const BOARD_SIZE_BY_DIFFICULTY: Record<PuzzleDifficulty, number[]> = {
  easy: [4, 5, 6],
  normal: [7, 8],
  hard: [9]
};

const LETTER_SLOT_ORDER = [0, 2, 6, 8, 1, 5, 7, 3, 4];
const DEFAULT_OBJECT_TYPE: BoardObjectTypeId = DETECTIVE_OBJECTS[0]?.id ?? "chair";
const DEFAULT_OBSTACLE_TYPE: BoardObstacleTypeId = DETECTIVE_OBSTACLES[0]?.id ?? "table";

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
        objectType: null,
        obstacleType: null,
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

function pickRandomNumber(values: number[]) {
  return values[Math.floor(Math.random() * values.length)] ?? values[0] ?? 4;
}

export function getBoardSizeOptionsForDifficulty(difficulty: PuzzleDifficulty) {
  return BOARD_SIZE_BY_DIFFICULTY[getSafeDifficulty(difficulty)];
}

export function getBoardSizeRangeLabel(difficulty: PuzzleDifficulty) {
  const options = getBoardSizeOptionsForDifficulty(difficulty);
  const first = options[0];
  const last = options[options.length - 1];

  if (first === last) {
    return `${first}x${first}`;
  }

  return `${first}x${first} t/m ${last}x${last}`;
}

export function getRandomBoardSizeForDifficulty(difficulty: PuzzleDifficulty) {
  return pickRandomNumber(getBoardSizeOptionsForDifficulty(difficulty));
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

export function getCharacterCountForDifficulty(_difficulty: PuzzleDifficulty, maxCharacters: number) {
  return Math.max(1, Math.min(PLAY_LETTERS.length, Math.floor(maxCharacters)));
}

function calculateActiveLetters(rows: number, cols: number, cells: BoardCell[], difficulty: PuzzleDifficulty) {
  const maxCharacters = calculateMaxCharacters(rows, cols, cells);
  const characterCount = getCharacterCountForDifficulty(difficulty, maxCharacters);
  return makeActiveLettersForCharacterCount(characterCount);
}

function clearSolution(board: BoardGrid) {
  board.solution = null;
  board.murdererLetter = null;
  board.hints = [];
  return board;
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

function isSolutionCellValid(board: BoardGrid, row: number, col: number) {
  const cell = board.cells.find((candidate) => candidate.row === row && candidate.col === col);
  return Boolean(cell?.isActive && !cell.isBlocked && !cell.isObject);
}

function sanitizeSolution(board: BoardGrid) {
  if (!board.solution) {
    board.murdererLetter = null;
    return board;
  }

  const activeLetterSet = new Set(board.activeLetters);
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  for (const letter of board.activeLetters) {
    const position = board.solution[letter];

    if (!position || !isSolutionCellValid(board, position.row, position.col)) {
      return clearSolution(board);
    }

    if (usedRows.has(position.row) || usedCols.has(position.col)) {
      return clearSolution(board);
    }

    usedRows.add(position.row);
    usedCols.add(position.col);
  }

  for (const key of Object.keys(board.solution)) {
    if (!activeLetterSet.has(key as PlayLetter)) {
      return clearSolution(board);
    }
  }

  if (board.murdererLetter && !activeLetterSet.has(board.murdererLetter)) {
    return clearSolution(board);
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
    const isObject = cell.isObject ?? false;
    const isBlocked = cell.isBlocked ?? false;

    return {
      ...cell,
      isObject,
      objectType: isObject ? cell.objectType ?? DEFAULT_OBJECT_TYPE : null,
      obstacleType: isBlocked ? cell.obstacleType ?? DEFAULT_OBSTACLE_TYPE : null,
      manualCross,
      autoCrossSources,
      isCrossed: manualCross || autoCrossSources.length > 0,
      finalLetter: cell.finalLetter ?? null,
      playMarks: Array.isArray(cell.playMarks) && cell.playMarks.length === 9 ? [...cell.playMarks] : makeEmptyMarks(),
      isBlocked,
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
    solution: board.solution ?? null,
    murdererLetter: board.murdererLetter ?? null,
    hints: Array.isArray(board.hints) ? [...board.hints] : [],
    cells: normalizedCells,
    rooms: (board.rooms ?? []).map((room, index) => {
      const fallback = getRoomDefinitionByIndex(index);
      return {
        ...room,
        name: typeof room.name === "string" && room.name.length > 0 ? room.name : fallback.name,
        color: room.color ?? fallback.color,
        cells: room.cells.map(([row, col]) => [row, col] as [number, number])
      };
    }),
    verticalWalls: board.verticalWalls.map((line) => [...line]),
    horizontalWalls: board.horizontalWalls.map((line) => [...line])
  };

  return sanitizeSolution(sanitizePlayLetters(normalizedBoard));
}

function cloneBoard(board: BoardGrid): BoardGrid {
  return normalizeBoard(board);
}

function recalculateAutoCrosses(board: BoardGrid) {
  sanitizeSolution(sanitizePlayLetters(board));

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
    solution: null,
    murdererLetter: null,
    hints: []
  };

  return recalculateRooms(board);
}

export function createBoardForDifficulty(difficulty: PuzzleDifficulty, referenceImageUrl: string | null) {
  const size = getRandomBoardSizeForDifficulty(difficulty);
  return createBoard(size, size, referenceImageUrl, difficulty);
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

function oldRoomDetails(board: BoardGrid) {
  const result = new Map<string, { color: string; name: string | null }>();

  for (const room of board.rooms) {
    result.set(room.id, { color: room.color, name: room.name ?? null });
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
  const previousDetails = oldRoomDetails(input);
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
    const fallback = getRoomDefinitionByIndex(rooms.length);
    const details = bestOldRoomId ? previousDetails.get(bestOldRoomId) : null;

    rooms.push({
      id,
      name: details?.name ?? fallback.name,
      color: details?.color ?? fallback.color,
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
  cell.objectType = null;
  cell.obstacleType = null;
  cell.isCrossed = false;
  cell.manualCross = false;
  cell.autoCrossSources = [];
  cell.finalLetter = null;
  cell.playMarks = makeEmptyMarks();
  clearSolution(board);
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

  clearSolution(board);
  return recalculateRooms(board);
}

export function setRoomDetails(input: BoardGrid, roomId: string, color: string, name: string) {
  const board = cloneBoard(input);
  board.rooms = board.rooms.map((room) => (room.id === roomId ? { ...room, color, name } : room));
  board.hints = [];
  return board;
}

export function setRoomColor(input: BoardGrid, roomId: string, color: string) {
  const board = cloneBoard(input);
  board.rooms = board.rooms.map((room) => (room.id === roomId ? { ...room, color } : room));
  board.hints = [];
  return board;
}

export function applyBuilderTool(
  input: BoardGrid,
  row: number,
  col: number,
  tool: BuilderToolMode,
  color: string,
  roomName = "Kamer",
  objectType: BoardObjectTypeId = DEFAULT_OBJECT_TYPE,
  obstacleType: BoardObstacleTypeId = DEFAULT_OBSTACLE_TYPE
) {
  if (tool === "shape") {
    return toggleCellActive(input, row, col);
  }

  const board = cloneBoard(input);
  const cell = getCell(board, row, col);

  if (!cell.isActive) {
    return board;
  }

  if (tool === "color" && cell.roomId) {
    return setRoomDetails(board, cell.roomId, color, roomName);
  }

  if (tool === "object") {
    const nextValue = !cell.isObject || cell.objectType !== objectType;
    cell.isObject = nextValue;
    cell.objectType = nextValue ? objectType : null;
    if (cell.isObject) {
      cell.isBlocked = false;
      cell.obstacleType = null;
    }
    clearSolution(board);
    return recalculateRooms(board);
  }

  if (tool === "blocked") {
    const nextValue = !cell.isBlocked || cell.obstacleType !== obstacleType;
    cell.isBlocked = nextValue;
    cell.obstacleType = nextValue ? obstacleType : null;
    if (cell.isBlocked) {
      cell.isObject = false;
      cell.objectType = null;
    }
    cell.isCrossed = false;
    cell.manualCross = false;
    cell.autoCrossSources = [];
    cell.finalLetter = null;
    cell.playMarks = makeEmptyMarks();
    clearSolution(board);
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
