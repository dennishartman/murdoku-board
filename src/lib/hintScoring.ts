import type { MurderGoalState } from "./murderGoalSolver";
import type { BoardGrid, Hint } from "../types/board";

export type HintProgressScore = {
  score: number;
  newExactPositions: number;
  newKnownRooms: number;
  removedMurdererCandidates: number;
  victimRoomBecameKnown: boolean;
  murdererBecameKnown: boolean;
  murdererPositionBecameKnown: boolean;
  domainReduction: number;
};

function countKeys(value: Record<string, unknown>) {
  return Object.keys(value).length;
}

function roomCount(state: MurderGoalState) {
  return Object.keys(state.knownRooms).length;
}

function exactCount(state: MurderGoalState) {
  return Object.keys(state.exactPositions).length;
}

function isGeneralHint(hint: Hint) {
  return hint.type === "room_person_count" || (hint.type === "room_group_count" && !hint.subject);
}

function isDirectHint(hint: Hint) {
  return hint.type === "row_column" || (hint.type === "room" && hint.relation === "is_in");
}

function isWeakNegativeRoomHint(hint: Hint) {
  return hint.type === "room" && hint.relation === "is_not_in";
}

export function scoreHintProgress(board: BoardGrid, before: MurderGoalState, after: MurderGoalState, hint: Hint): HintProgressScore {
  const newExactPositions = Math.max(0, exactCount(after) - exactCount(before));
  const newKnownRooms = Math.max(0, roomCount(after) - roomCount(before));
  const removedMurdererCandidates = Math.max(0, before.murdererCandidates.length - after.murdererCandidates.length);
  const victimRoomBecameKnown = before.victimPossibleRooms.length !== 1 && after.victimPossibleRooms.length === 1;
  const murdererBecameKnown = !before.solvedMurderer && Boolean(after.solvedMurderer);
  const murdererPositionBecameKnown = !before.solvedMurdererPosition && Boolean(after.solvedMurdererPosition);
  const domainReduction = Math.max(0, before.totalDomainCount - after.totalDomainCount);
  let score = 0;

  score += newExactPositions * 250;
  score += newKnownRooms * 80;
  score += removedMurdererCandidates * 180;
  score += victimRoomBecameKnown ? 350 : 0;
  score += murdererBecameKnown ? 550 : 0;
  score += murdererPositionBecameKnown ? 700 : 0;
  score += Math.min(domainReduction * 8, 160);

  if (isDirectHint(hint)) {
    score += board.difficulty === "hard" ? 20 : 120;
  }

  if (isGeneralHint(hint)) {
    score += board.difficulty === "hard" ? 10 : 50;
  }

  if (isWeakNegativeRoomHint(hint)) {
    score -= board.difficulty === "hard" ? 20 : 180;
  }

  if (after.progressKey === before.progressKey) {
    score -= 500;
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

export function compareHintProgress(a: HintProgressScore, b: HintProgressScore) {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.murdererPositionBecameKnown !== b.murdererPositionBecameKnown) {
    return a.murdererPositionBecameKnown ? -1 : 1;
  }

  if (a.murdererBecameKnown !== b.murdererBecameKnown) {
    return a.murdererBecameKnown ? -1 : 1;
  }

  if (a.victimRoomBecameKnown !== b.victimRoomBecameKnown) {
    return a.victimRoomBecameKnown ? -1 : 1;
  }

  if (a.newExactPositions !== b.newExactPositions) {
    return b.newExactPositions - a.newExactPositions;
  }

  if (a.removedMurdererCandidates !== b.removedMurdererCandidates) {
    return b.removedMurdererCandidates - a.removedMurdererCandidates;
  }

  if (a.domainReduction !== b.domainReduction) {
    return b.domainReduction - a.domainReduction;
  }

  return 0;
}
