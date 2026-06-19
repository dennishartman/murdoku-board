import type { BoardCell, BoardGrid, BoardSolution, CharacterRole, PlayLetter, SolutionPosition } from "../types/board";

type CandidateCell = {
  row: number;
  col: number;
  roomId: string;
};

type LockedPlacement = {
  letter: PlayLetter;
  cell: CandidateCell;
};

type SolutionDescription = {
  letter: PlayLetter;
  name: string;
  role: CharacterRole;
  row: number;
  col: number;
  roomId: string | null;
  isMurderer: boolean;
};

type GenerateSolutionResult =
  | {
      ok: true;
      solution: BoardSolution;
      murdererLetter: PlayLetter;
      message: string;
    }
  | {
      ok: false;
      solution: null;
      murdererLetter: null;
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

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function toCandidateCell(cell: BoardCell): CandidateCell | null {
  if (!cell.isActive || cell.isBlocked || cell.isObject || !cell.roomId) {
    return null;
  }

  return {
    row: cell.row,
    col: cell.col,
    roomId: cell.roomId
  };
}

function getAvailableCells(board: BoardGrid) {
  return board.cells
    .map(toCandidateCell)
    .filter((cell): cell is CandidateCell => Boolean(cell));
}

function getRowsAndCols(cells: CandidateCell[]) {
  return {
    rows: Array.from(new Set(cells.map((cell) => cell.row))).sort((a, b) => a - b),
    cols: Array.from(new Set(cells.map((cell) => cell.col))).sort((a, b) => a - b)
  };
}

function getRoomCandidatePairs(cells: CandidateCell[]) {
  const byRoom = new Map<string, CandidateCell[]>();

  for (const cell of cells) {
    byRoom.set(cell.roomId, [...(byRoom.get(cell.roomId) ?? []), cell]);
  }

  const pairs: Array<{ victimCell: CandidateCell; murdererCell: CandidateCell }> = [];

  for (const roomCells of byRoom.values()) {
    if (roomCells.length < 2) {
      continue;
    }

    for (const victimCell of roomCells) {
      for (const murdererCell of roomCells) {
        if (victimCell.row === murdererCell.row || victimCell.col === murdererCell.col) {
          continue;
        }

        pairs.push({ victimCell, murdererCell });
      }
    }
  }

  return shuffle(pairs);
}

function findMatchingCells(cells: CandidateCell[], lockedPlacements: LockedPlacement[], remainingLetters: PlayLetter[]) {
  const lockedRows = new Set(lockedPlacements.map((placement) => placement.cell.row));
  const lockedCols = new Set(lockedPlacements.map((placement) => placement.cell.col));
  const blockedKeys = new Set(lockedPlacements.map((placement) => cellKey(placement.cell.row, placement.cell.col)));
  const remainingRows = Array.from(new Set(cells.map((cell) => cell.row))).filter((row) => !lockedRows.has(row)).sort((a, b) => a - b);
  const remainingCols = Array.from(new Set(cells.map((cell) => cell.col))).filter((col) => !lockedCols.has(col)).sort((a, b) => a - b);

  if (remainingRows.length !== remainingLetters.length || remainingCols.length !== remainingLetters.length) {
    return null;
  }

  const rowCandidates = remainingRows.map((row) => ({
    row,
    candidates: shuffle(cells.filter((cell) => cell.row === row && remainingCols.includes(cell.col) && !blockedKeys.has(cellKey(cell.row, cell.col))))
  }));

  if (rowCandidates.some((entry) => entry.candidates.length === 0)) {
    return null;
  }

  const orderedRows = rowCandidates.sort((a, b) => a.candidates.length - b.candidates.length);
  const usedCols = new Set<number>();
  const result = new Map<number, CandidateCell>();

  function backtrack(index: number): boolean {
    if (index >= orderedRows.length) {
      return true;
    }

    const entry = orderedRows[index];

    for (const cell of entry.candidates) {
      if (usedCols.has(cell.col)) {
        continue;
      }

      usedCols.add(cell.col);
      result.set(entry.row, cell);

      if (backtrack(index + 1)) {
        return true;
      }

      result.delete(entry.row);
      usedCols.delete(cell.col);
    }

    return false;
  }

  if (!backtrack(0)) {
    return null;
  }

  return remainingRows.map((row) => result.get(row) as CandidateCell);
}

function makeSolution(lockedPlacements: LockedPlacement[], remainingLetters: PlayLetter[], remainingCells: CandidateCell[]) {
  const solution: BoardSolution = {};
  const shuffledLetters = shuffle(remainingLetters);
  const shuffledCells = shuffle(remainingCells);

  for (const placement of lockedPlacements) {
    solution[placement.letter] = {
      row: placement.cell.row,
      col: placement.cell.col
    };
  }

  for (let index = 0; index < shuffledLetters.length; index += 1) {
    solution[shuffledLetters[index]] = {
      row: shuffledCells[index].row,
      col: shuffledCells[index].col
    };
  }

  return solution;
}

function getCellRoomId(board: BoardGrid, position: SolutionPosition | undefined) {
  if (!position) {
    return null;
  }

  return board.cells.find((cell) => cell.row === position.row && cell.col === position.col)?.roomId ?? null;
}

export function generateSolution(board: BoardGrid): GenerateSolutionResult {
  if (board.activeLetters.length === 0) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Er zijn geen actieve personages voor dit bord."
    };
  }

  if (!board.activeLetters.includes("V")) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Er is geen slachtoffer gekoppeld aan dit bord."
    };
  }

  const suspectLetters = board.activeLetters.filter((letter) => letter !== "V");

  if (suspectLetters.length === 0) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Er is minimaal 1 verdachte nodig."
    };
  }

  const availableCells = getAvailableCells(board);
  const { rows, cols } = getRowsAndCols(availableCells);

  if (rows.length !== board.activeLetters.length || cols.length !== board.activeLetters.length) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Er kon geen oplossing worden gemaakt. Controleer of elke rij en kolom minimaal 1 vrije cel heeft."
    };
  }

  if (board.rooms.length < 2) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Maak eerst minimaal 2 kamers. Het slachtoffer moet met precies 1 verdachte in een kamer staan."
    };
  }

  const roomPairs = getRoomCandidatePairs(availableCells);

  if (roomPairs.length === 0) {
    return {
      ok: false,
      solution: null,
      murdererLetter: null,
      message: "Er is geen kamer met 2 vrije cellen in verschillende rijen en kolommen. Daardoor kan er nog geen moordenaar bij het slachtoffer staan."
    };
  }

  for (const pair of roomPairs) {
    for (const murdererLetter of shuffle(suspectLetters)) {
      const lockedPlacements: LockedPlacement[] = [
        { letter: "V", cell: pair.victimCell },
        { letter: murdererLetter, cell: pair.murdererCell }
      ];
      const remainingLetters = board.activeLetters.filter((letter) => letter !== "V" && letter !== murdererLetter);
      const remainingCellsPool = availableCells.filter((cell) => cell.roomId !== pair.victimCell.roomId);
      const remainingCells = findMatchingCells(remainingCellsPool, lockedPlacements, remainingLetters);

      if (!remainingCells) {
        continue;
      }

      const solution = makeSolution(lockedPlacements, remainingLetters, remainingCells);

      return {
        ok: true,
        solution,
        murdererLetter,
        message: `Oplossing gegenereerd voor ${board.activeLetters.length} personages. ${murdererLetter} is de moordenaar en staat bij het slachtoffer in de kamer.`
      };
    }
  }

  return {
    ok: false,
    solution: null,
    murdererLetter: null,
    message: "Er kon geen geldige oplossing worden gemaakt waarbij precies 1 verdachte bij het slachtoffer in de kamer staat. Pas de kamers, objecten of stopcellen aan."
  };
}

export function describeSolution(board: BoardGrid): SolutionDescription[] {
  const solution = board.solution;

  if (!solution) {
    return [];
  }

  const descriptions: SolutionDescription[] = [];

  for (const letter of board.activeLetters) {
    const position: SolutionPosition | undefined = solution[letter];
    const character = board.activeCharacters[letter];

    if (!position) {
      continue;
    }

    descriptions.push({
      letter,
      name: character?.name ?? letter,
      role: character?.role ?? "suspect",
      row: position.row + 1,
      col: position.col + 1,
      roomId: getCellRoomId(board, position),
      isMurderer: board.murdererLetter === letter
    });
  }

  return descriptions;
}
