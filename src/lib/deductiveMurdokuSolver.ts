import type { HumanCandidateSolution } from "./humanSolver";
import type { BoardGrid, PlayLetter, SolutionPosition } from "../types/board";

export type DeductiveState = {
  exactPositions: Partial<Record<PlayLetter, SolutionPosition>>;
  knownRooms: Partial<Record<PlayLetter, string>>;
  victimRooms: string[];
  murdererCandidates: PlayLetter[];
  solvedMurderer: PlayLetter | null;
  solvedMurdererPosition: SolutionPosition | null;
  totalDomainCount: number;
  exactCount: number;
  knownRoomCount: number;
  progressKey: string;
};

export type DeductiveProgress = {
  score: number;
  newExactPositions: number;
  newKnownRooms: number;
  removedMurdererCandidates: number;
  victimRoomBecameKnown: boolean;
  murdererBecameKnown: boolean;
  murdererPositionBecameKnown: boolean;
  domainReduction: number;
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

function getCellRoom(board: BoardGrid, position: SolutionPosition | undefined) {
  if (!position) {
    return null;
  }

  return board.cells.find((cell) => cell.row === position.row && cell.col === position.col)?.roomId ?? null;
}

function domainForLetter(candidates: HumanCandidateSolution[], letter: PlayLetter) {
  const values = new Set<string>();

  for (const candidate of candidates) {
    const position = candidate.solution[letter];

    if (position) {
      values.add(positionKey(position));
    }
  }

  return values;
}

function roomsForDomain(board: BoardGrid, domain: Set<string>) {
  const values = new Set<string>();

  for (const key of domain) {
    const position = parsePositionKey(key);
    const roomId = getCellRoom(board, position ?? undefined);

    if (roomId) {
      values.add(roomId);
    }
  }

  return values;
}

function sortedLetters(letters: PlayLetter[]) {
  return [...letters].sort((a, b) => a.localeCompare(b));
}

function sortedRooms(rooms: Set<string>) {
  return Array.from(rooms).sort((a, b) => a.localeCompare(b));
}

export function analyzeDeductiveState(board: BoardGrid, candidates: HumanCandidateSolution[]): DeductiveState {
  const exactPositions: Partial<Record<PlayLetter, SolutionPosition>> = {};
  const knownRooms: Partial<Record<PlayLetter, string>> = {};
  const domains = new Map<PlayLetter, Set<string>>();
  let totalDomainCount = 0;

  for (const letter of board.activeLetters) {
    const domain = domainForLetter(candidates, letter);
    const rooms = roomsForDomain(board, domain);
    domains.set(letter, domain);
    totalDomainCount += domain.size;

    if (domain.size === 1) {
      const key = Array.from(domain)[0];
      const position = key ? parsePositionKey(key) : null;

      if (position) {
        exactPositions[letter] = position;
      }
    }

    if (rooms.size === 1) {
      const roomId = Array.from(rooms)[0];

      if (roomId) {
        knownRooms[letter] = roomId;
      }
    }
  }

  const victimRooms = sortedRooms(roomsForDomain(board, domains.get("V") ?? new Set<string>()));
  const murdererValues = new Set(candidates.map((candidate) => candidate.murdererLetter));
  const murdererCandidates = sortedLetters(board.activeLetters.filter((letter) => {
    if (letter === "V" || !murdererValues.has(letter)) {
      return false;
    }

    const suspectRooms = roomsForDomain(board, domains.get(letter) ?? new Set<string>());
    return victimRooms.some((roomId) => suspectRooms.has(roomId));
  }));
  const solvedMurderer = murdererCandidates.length === 1 ? murdererCandidates[0] ?? null : null;
  const solvedMurdererPosition = solvedMurderer ? exactPositions[solvedMurderer] ?? null : null;
  const exactCount = Object.keys(exactPositions).length;
  const knownRoomCount = Object.keys(knownRooms).length;
  const exactPart = board.activeLetters
    .filter((letter) => exactPositions[letter])
    .map((letter) => `${letter}:${positionKey(exactPositions[letter] as SolutionPosition)}`)
    .join("|");
  const roomPart = board.activeLetters
    .filter((letter) => knownRooms[letter])
    .map((letter) => `${letter}:${knownRooms[letter]}`)
    .join("|");
  const progressKey = [
    `victimRooms:${victimRooms.join(",")}`,
    `murdererCandidates:${murdererCandidates.join(",")}`,
    `solved:${solvedMurderer ?? "?"}`,
    `solvedPosition:${solvedMurdererPosition ? positionKey(solvedMurdererPosition) : "?"}`,
    `exact:${exactPart}`,
    `rooms:${roomPart}`,
    `domain:${totalDomainCount}`
  ].join("#");

  return {
    exactPositions,
    knownRooms,
    victimRooms,
    murdererCandidates,
    solvedMurderer,
    solvedMurdererPosition,
    totalDomainCount,
    exactCount,
    knownRoomCount,
    progressKey
  };
}

export function isDeductivelySolved(board: BoardGrid, state: DeductiveState) {
  if (!state.solvedMurderer || !state.solvedMurdererPosition) {
    return false;
  }

  const victimRoomKnown = state.victimRooms.length === 1 || Boolean(state.knownRooms.V);
  const murdererRoomKnown = Boolean(state.knownRooms[state.solvedMurderer]);

  return victimRoomKnown && murdererRoomKnown && board.activeLetters.includes(state.solvedMurderer);
}

export function scoreDeductiveProgress(before: DeductiveState, after: DeductiveState): DeductiveProgress {
  const newExactPositions = Math.max(0, after.exactCount - before.exactCount);
  const newKnownRooms = Math.max(0, after.knownRoomCount - before.knownRoomCount);
  const removedMurdererCandidates = Math.max(0, before.murdererCandidates.length - after.murdererCandidates.length);
  const victimRoomBecameKnown = before.victimRooms.length !== 1 && after.victimRooms.length === 1;
  const murdererBecameKnown = !before.solvedMurderer && Boolean(after.solvedMurderer);
  const murdererPositionBecameKnown = !before.solvedMurdererPosition && Boolean(after.solvedMurdererPosition);
  const domainReduction = Math.max(0, before.totalDomainCount - after.totalDomainCount);
  let score = 0;

  score += victimRoomBecameKnown ? 500 : 0;
  score += removedMurdererCandidates * 220;
  score += murdererBecameKnown ? 700 : 0;
  score += murdererPositionBecameKnown ? 900 : 0;
  score += newExactPositions * 220;
  score += newKnownRooms * 110;
  score += Math.min(domainReduction * 4, 160);

  if (after.progressKey === before.progressKey) {
    score -= 1000;
  }

  return {
    score,
    newExactPositions,
    newKnownRooms,
    removedMurdererCandidates,
    victimRoomBecameKnown,
    murdererBecameKnown,
    murdererPositionBecameKnown,
    domainReduction
  };
}
