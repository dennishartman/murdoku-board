import type { HumanCandidateSolution } from "./humanSolver";
import type { BoardGrid, PlayLetter, SolutionPosition } from "../types/board";

export type MurderGoalState = {
  exactPositions: Partial<Record<PlayLetter, SolutionPosition>>;
  knownRooms: Partial<Record<PlayLetter, string>>;
  victimPossibleRooms: string[];
  murdererCandidates: PlayLetter[];
  solvedMurderer: PlayLetter | null;
  solvedMurdererPosition: SolutionPosition | null;
  totalDomainCount: number;
  progressKey: string;
};

function positionKey(position: SolutionPosition) {
  return `${position.row}:${position.col}`;
}

function getCellRoom(board: BoardGrid, position: SolutionPosition | undefined) {
  if (!position) {
    return null;
  }

  return board.cells.find((cell) => cell.row === position.row && cell.col === position.col)?.roomId ?? null;
}

function parsePositionKey(key: string): SolutionPosition | null {
  const parts = key.split(":");
  const row = Number(parts[0]);
  const col = Number(parts[1]);

  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return null;
  }

  return { row, col };
}

function domainForLetter(candidates: HumanCandidateSolution[], letter: PlayLetter) {
  const positions = new Set<string>();

  for (const candidate of candidates) {
    const position = candidate.solution[letter];

    if (position) {
      positions.add(positionKey(position));
    }
  }

  return positions;
}

function roomSetForDomain(board: BoardGrid, domain: Set<string>) {
  const rooms = new Set<string>();

  for (const key of domain) {
    const position = parsePositionKey(key);
    const roomId = getCellRoom(board, position ?? undefined);

    if (roomId) {
      rooms.add(roomId);
    }
  }

  return rooms;
}

function sortLetters(letters: PlayLetter[]) {
  return [...letters].sort((a, b) => a.localeCompare(b));
}

export function analyzeMurderGoal(board: BoardGrid, candidates: HumanCandidateSolution[]): MurderGoalState {
  const exactPositions: Partial<Record<PlayLetter, SolutionPosition>> = {};
  const knownRooms: Partial<Record<PlayLetter, string>> = {};
  const domains = new Map<PlayLetter, Set<string>>();
  let totalDomainCount = 0;

  for (const letter of board.activeLetters) {
    const domain = domainForLetter(candidates, letter);
    domains.set(letter, domain);
    totalDomainCount += domain.size;

    if (domain.size === 1) {
      const onlyKey = Array.from(domain)[0];
      const position = onlyKey ? parsePositionKey(onlyKey) : null;

      if (position) {
        exactPositions[letter] = position;
      }
    }

    const roomIds = roomSetForDomain(board, domain);

    if (roomIds.size === 1) {
      const onlyRoomId = Array.from(roomIds)[0];

      if (onlyRoomId) {
        knownRooms[letter] = onlyRoomId;
      }
    }
  }

  const victimDomain = domains.get("V") ?? new Set<string>();
  const victimPossibleRooms = Array.from(roomSetForDomain(board, victimDomain)).sort((a, b) => a.localeCompare(b));
  const candidateMurderers = new Set<PlayLetter>(candidates.map((candidate) => candidate.murdererLetter));
  const murdererCandidates = sortLetters(board.activeLetters.filter((letter) => {
    if (letter === "V") {
      return false;
    }

    if (!candidateMurderers.has(letter)) {
      return false;
    }

    const domain = domains.get(letter) ?? new Set<string>();
    const rooms = roomSetForDomain(board, domain);
    return victimPossibleRooms.some((roomId) => rooms.has(roomId));
  }));
  const solvedMurderer = murdererCandidates.length === 1 ? murdererCandidates[0] ?? null : null;
  const solvedMurdererPosition = solvedMurderer ? exactPositions[solvedMurderer] ?? null : null;
  const exactPart = board.activeLetters
    .filter((letter) => exactPositions[letter])
    .map((letter) => `${letter}:${positionKey(exactPositions[letter] as SolutionPosition)}`)
    .join("|");
  const roomPart = board.activeLetters
    .filter((letter) => knownRooms[letter])
    .map((letter) => `${letter}:${knownRooms[letter]}`)
    .join("|");
  const progressKey = [
    `murderer:${solvedMurderer ?? "?"}`,
    `murdererPos:${solvedMurdererPosition ? positionKey(solvedMurdererPosition) : "?"}`,
    `victimRooms:${victimPossibleRooms.join(",")}`,
    `candidates:${murdererCandidates.join(",")}`,
    `exact:${exactPart}`,
    `rooms:${roomPart}`,
    `domain:${totalDomainCount}`
  ].join("#");

  return {
    exactPositions,
    knownRooms,
    victimPossibleRooms,
    murdererCandidates,
    solvedMurderer,
    solvedMurdererPosition,
    totalDomainCount,
    progressKey
  };
}

export function isMurderGoalSolved(board: BoardGrid, state: MurderGoalState) {
  if (!state.solvedMurderer || !state.solvedMurdererPosition) {
    return false;
  }

  const victimRoomKnown = state.victimPossibleRooms.length === 1 || Boolean(state.knownRooms.V);
  const murdererHasExactPosition = Boolean(state.exactPositions[state.solvedMurderer]);
  const victimAndMurdererRoomsKnown = victimRoomKnown && Boolean(state.knownRooms[state.solvedMurderer]);

  return murdererHasExactPosition && victimAndMurdererRoomsKnown && board.activeLetters.includes(state.solvedMurderer);
}
