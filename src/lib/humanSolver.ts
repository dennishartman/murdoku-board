import type { BoardGrid, BoardSolution, PlayLetter, SolutionPosition } from "../types/board";

export type HumanCandidateSolution = {
  solution: BoardSolution;
  murdererLetter: PlayLetter;
  key: string;
};

export type HumanSolveResult = {
  placed: Partial<Record<PlayLetter, SolutionPosition>>;
  placedLetters: PlayLetter[];
  unsolvedLetters: PlayLetter[];
  totalDomainCount: number;
};

function positionKey(position: SolutionPosition) {
  return `${position.row}:${position.col}`;
}

function parsePositionKey(key: string): SolutionPosition | null {
  const parts = key.split(":");
  const rowText = parts[0];
  const colText = parts[1];

  if (rowText === undefined || colText === undefined) {
    return null;
  }

  const row = Number(rowText);
  const col = Number(colText);

  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return null;
  }

  return { row, col };
}

function getPosition(solution: BoardSolution, letter: PlayLetter) {
  return solution[letter];
}

function buildDomains(board: BoardGrid, candidates: HumanCandidateSolution[], placed: Partial<Record<PlayLetter, SolutionPosition>>) {
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();

  for (const position of Object.values(placed)) {
    if (!position) {
      continue;
    }

    usedRows.add(position.row);
    usedCols.add(position.col);
  }

  const domains = new Map<PlayLetter, Set<string>>();

  for (const letter of board.activeLetters) {
    if (placed[letter]) {
      continue;
    }

    const positions = new Set<string>();

    for (const candidate of candidates) {
      const position = getPosition(candidate.solution, letter);

      if (!position) {
        continue;
      }

      if (usedRows.has(position.row) || usedCols.has(position.col)) {
        continue;
      }

      positions.add(positionKey(position));
    }

    domains.set(letter, positions);
  }

  return domains;
}

export function analyzeHumanSolve(board: BoardGrid, candidates: HumanCandidateSolution[]): HumanSolveResult {
  const placed: Partial<Record<PlayLetter, SolutionPosition>> = {};
  let changed = true;

  while (changed) {
    changed = false;
    const domains = buildDomains(board, candidates, placed);

    for (const letter of board.activeLetters) {
      if (placed[letter]) {
        continue;
      }

      const domain = domains.get(letter);

      if (!domain || domain.size !== 1) {
        continue;
      }

      const onlyKey = Array.from(domain)[0];
      const position = onlyKey ? parsePositionKey(onlyKey) : null;

      if (!position) {
        continue;
      }

      placed[letter] = position;
      changed = true;
    }
  }

  const finalDomains = buildDomains(board, candidates, placed);
  const placedLetters = board.activeLetters.filter((letter) => Boolean(placed[letter]));
  const unsolvedLetters = board.activeLetters.filter((letter) => !placed[letter]);
  const totalDomainCount = Array.from(finalDomains.values()).reduce((total, domain) => total + domain.size, 0);

  return {
    placed,
    placedLetters,
    unsolvedLetters,
    totalDomainCount
  };
}
