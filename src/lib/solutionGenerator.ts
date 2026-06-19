import type { BoardGrid, BoardSolution, PlayLetter, SolutionPosition } from "../types/board";

type CandidateCell = {
  row: number;
  col: number;
};

type GenerateSolutionResult =
  | {
      ok: true;
      solution: BoardSolution;
      message: string;
    }
  | {
      ok: false;
      solution: null;
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

function isValidSolutionCell(board: BoardGrid, row: number, col: number) {
  const cell = board.cells.find((candidate) => candidate.row === row && candidate.col === col);
  return Boolean(cell?.isActive && !cell.isBlocked && !cell.isObject);
}

function getAvailableRowsAndCols(board: BoardGrid) {
  const rows = new Set<number>();
  const cols = new Set<number>();

  for (const cell of board.cells) {
    if (!cell.isActive || cell.isBlocked || cell.isObject) {
      continue;
    }

    rows.add(cell.row);
    cols.add(cell.col);
  }

  return {
    rows: Array.from(rows).sort((a, b) => a - b),
    cols: Array.from(cols).sort((a, b) => a - b)
  };
}

function findMatchingCells(board: BoardGrid) {
  const { rows, cols } = getAvailableRowsAndCols(board);
  const needed = board.activeLetters.length;

  if (rows.length !== needed || cols.length !== needed) {
    return null;
  }

  const rowCandidates = rows.map((row) => ({
    row,
    candidates: shuffle(cols.filter((col) => isValidSolutionCell(board, row, col)))
  }));

  if (rowCandidates.some((entry) => entry.candidates.length === 0)) {
    return null;
  }

  const orderedRows = rowCandidates.sort((a, b) => a.candidates.length - b.candidates.length);
  const usedCols = new Set<number>();
  const result = new Map<number, number>();

  function backtrack(index: number): boolean {
    if (index >= orderedRows.length) {
      return true;
    }

    const entry = orderedRows[index];

    for (const col of entry.candidates) {
      if (usedCols.has(col)) {
        continue;
      }

      usedCols.add(col);
      result.set(entry.row, col);

      if (backtrack(index + 1)) {
        return true;
      }

      result.delete(entry.row);
      usedCols.delete(col);
    }

    return false;
  }

  if (!backtrack(0)) {
    return null;
  }

  return rows.map((row) => ({ row, col: result.get(row) as number }));
}

function makeSolution(letters: PlayLetter[], cells: CandidateCell[]) {
  const solution: BoardSolution = {};
  const shuffledLetters = shuffle(letters);
  const shuffledCells = shuffle(cells);

  for (let index = 0; index < shuffledLetters.length; index += 1) {
    solution[shuffledLetters[index]] = {
      row: shuffledCells[index].row,
      col: shuffledCells[index].col
    };
  }

  return solution;
}

export function generateSolution(board: BoardGrid): GenerateSolutionResult {
  if (board.activeLetters.length === 0) {
    return {
      ok: false,
      solution: null,
      message: "Er zijn geen actieve personages voor dit bord."
    };
  }

  const matchingCells = findMatchingCells(board);

  if (!matchingCells) {
    return {
      ok: false,
      solution: null,
      message: "Er kon geen oplossing worden gemaakt. Controleer of elke rij en kolom minimaal 1 vrije cel heeft."
    };
  }

  const solution = makeSolution(board.activeLetters, matchingCells);

  return {
    ok: true,
    solution,
    message: `Oplossing gegenereerd voor ${board.activeLetters.length} personages.`
  };
}

export function describeSolution(board: BoardGrid) {
  const solution = board.solution;

  if (!solution) {
    return [];
  }

  return board.activeLetters
    .map((letter) => {
      const position: SolutionPosition | undefined = solution[letter];
      const character = board.activeCharacters[letter];

      if (!position) {
        return null;
      }

      return {
        letter,
        name: character?.name ?? letter,
        role: character?.role ?? "suspect",
        row: position.row + 1,
        col: position.col + 1
      };
    })
    .filter((entry): entry is { letter: PlayLetter; name: string; role: string; row: number; col: number } => Boolean(entry));
}
