import type {
  BoardCell,
  BoardGrid,
  BoardSolution,
  Hint,
  HintSubject,
  HintTarget,
  PlayLetter,
  SolutionPosition
} from "../types/board";

type GenerateHintsResult =
  | { ok: true; hints: Hint[]; candidateCount: number; message: string }
  | { ok: false; hints: []; candidateCount: number; message: string };

type DirectHintKind = "room" | "row" | "col";
type DirectionKind = "above" | "below" | "left_of" | "right_of";
type SolverAssignment = Partial<Record<PlayLetter, SolutionPosition>>;
type PartialBuildResult = { hints: Hint[] };
type HintValidationResult =
  | { ok: true; message: string; murdererLetter: PlayLetter; victimPosition: SolutionPosition; solutionCount: number }
  | { ok: false; message: string; solutionCount: number };

type PersonRelationCandidate = { hint: Hint; subject: PlayLetter; target: PlayLetter; score: number };

const SOLUTION_LIMIT = 30;
const HARD_MIN_PERSON_RELATIONS = 4;
const HARD_MAX_DIRECTLY_SOLVABLE = 2;
const HARD_MIN_CHAIN_LENGTH = 3;

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
  return position ? getCell(board, position.row, position.col)?.roomId ?? null : null;
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

function makeCharacterTarget(letter: PlayLetter): HintTarget {
  return { kind: "character", letter };
}

function makeObjectTarget(cell: BoardCell, includeObstacles: boolean): HintTarget | null {
  if (cell.isObject && cell.objectType) {
    return { kind: "object", objectType: cell.objectType, roomId: cell.roomId };
  }

  if (includeObstacles && cell.isBlocked && cell.obstacleType) {
    return { kind: "obstacle", obstacleType: cell.obstacleType, roomId: cell.roomId };
  }

  return null;
}

function directionForSameLine(position: SolutionPosition, target: SolutionPosition): DirectionKind | null {
  if (position.row === target.row) {
    return position.col < target.col ? "left_of" : "right_of";
  }

  if (position.col === target.col) {
    return position.row < target.row ? "above" : "below";
  }

  return null;
}

function relationMatchesPosition(type: "adjacent" | "diagonal" | "direction", position: SolutionPosition, target: SolutionPosition, direction?: DirectionKind) {
  if (type === "adjacent") {
    return isAdjacent(position, target);
  }

  if (type === "diagonal") {
    return isDiagonal(position, target);
  }

  if (direction === "left_of") {
    return position.row === target.row && position.col < target.col;
  }

  if (direction === "right_of") {
    return position.row === target.row && position.col > target.col;
  }

  if (direction === "above") {
    return position.col === target.col && position.row < target.row;
  }

  if (direction === "below") {
    return position.col === target.col && position.row > target.row;
  }

  return false;
}

function distanceMatches(position: SolutionPosition, target: SolutionPosition, axis: "row" | "col" | "either", distance: number, relation: "exactly" | "not_exactly" | "at_least" | "at_most") {
  const rowDistance = Math.abs(position.row - target.row);
  const colDistance = Math.abs(position.col - target.col);
  const value = axis === "row" ? rowDistance : axis === "col" ? colDistance : rowDistance + colDistance;

  if (relation === "exactly") {
    return value === distance;
  }

  if (relation === "not_exactly") {
    return value !== distance;
  }

  if (relation === "at_least") {
    return value >= distance;
  }

  return value <= distance;
}

function hintKey(hint: Hint) {
  return JSON.stringify(hint);
}

function uniqueHints(hints: Hint[]) {
  const seen = new Set<string>();
  const result: Hint[] = [];

  for (const hint of hints) {
    const key = hintKey(hint);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(hint);
    }
  }

  return result;
}

function addHint(hints: Hint[], hint: Hint) {
  if (hints.some((candidate) => hintKey(candidate) === hintKey(hint))) {
    return false;
  }

  hints.push(hint);
  return true;
}

function addVictimRule(hints: Hint[]) {
  addHint(hints, { id: "victim-murderer-room", type: "murderer_room", victimLetter: "V" });
}

function hintSubjectLetter(hint: Hint) {
  if (hint.type === "murderer_room" || hint.type === "room_person_count") {
    return null;
  }

  if (hint.type === "room_group_count") {
    return hint.subject?.kind === "character" ? hint.subject.letter : null;
  }

  return hint.subject.kind === "character" ? hint.subject.letter : null;
}

function hintCoversLetter(hint: Hint, letter: PlayLetter) {
  return hintSubjectLetter(hint) === letter;
}

function hintTarget(hint: Hint): HintTarget | null {
  if (hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "distance" || hint.type === "direction") {
    return hint.target;
  }

  return null;
}

function usesObstacleTarget(hint: Hint) {
  return hintTarget(hint)?.kind === "obstacle";
}

function usesObjectTarget(hint: Hint) {
  return hintTarget(hint)?.kind === "object";
}

function usesCharacterTarget(hint: Hint) {
  return hintTarget(hint)?.kind === "character";
}

function getDirectHintKind(hint: Hint): { letter: PlayLetter; kind: DirectHintKind } | null {
  if (hint.type === "room" && hint.relation === "is_in" && hint.subject.kind === "character") {
    return { letter: hint.subject.letter, kind: "room" };
  }

  if (hint.type === "row_column" && hint.relation === "is" && hint.subject.kind === "character") {
    return { letter: hint.subject.letter, kind: hint.axis === "row" ? "row" : "col" };
  }

  return null;
}

function getDirectHintMap(hints: Hint[]) {
  const result = new Map<PlayLetter, Set<DirectHintKind>>();

  for (const hint of hints) {
    const direct = getDirectHintKind(hint);

    if (!direct) {
      continue;
    }

    const set = result.get(direct.letter) ?? new Set<DirectHintKind>();
    set.add(direct.kind);
    result.set(direct.letter, set);
  }

  return result;
}

function findMurderer(board: BoardGrid) {
  const victimRoomId = getCellRoomId(board, getPosition(board.solution, "V"));

  if (!victimRoomId) {
    return null;
  }

  const suspectsInRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === victimRoomId);
  return suspectsInRoom.length === 1 ? suspectsInRoom[0] ?? null : null;
}

function getValidCells(board: BoardGrid) {
  return board.cells.filter(isValidPersonCell).map((cell) => ({ row: cell.row, col: cell.col }));
}

function targetMatchesCell(target: HintTarget, cell: BoardCell) {
  if (target.kind === "object") {
    return cell.isObject && Boolean(cell.objectType) && (!target.objectType || cell.objectType === target.objectType) && (!target.roomId || cell.roomId === target.roomId);
  }

  if (target.kind === "obstacle") {
    return cell.isBlocked && Boolean(cell.obstacleType) && (!target.obstacleType || cell.obstacleType === target.obstacleType) && (!target.roomId || cell.roomId === target.roomId);
  }

  return false;
}

function getTargetCells(board: BoardGrid, target: HintTarget) {
  if (target.kind !== "object" && target.kind !== "obstacle") {
    return [];
  }

  return board.cells.filter((cell) => targetMatchesCell(target, cell));
}

function relationToTargetCells(board: BoardGrid, type: "adjacent" | "diagonal" | "direction", position: SolutionPosition, target: HintTarget, direction?: DirectionKind) {
  return getTargetCells(board, target).some((cell) => relationMatchesPosition(type, position, { row: cell.row, col: cell.col }, direction));
}

function distanceToTargetCells(board: BoardGrid, position: SolutionPosition, target: HintTarget, axis: "row" | "col" | "either", distance: number, relation: "exactly" | "not_exactly" | "at_least" | "at_most") {
  return getTargetCells(board, target).some((cell) => distanceMatches(position, { row: cell.row, col: cell.col }, axis, distance, relation));
}

function filterDomainByHint(board: BoardGrid, letter: PlayLetter, domain: SolutionPosition[], hint: Hint) {
  if (hint.type === "row_column" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const value = hint.axis === "row" ? position.row + 1 : position.col + 1;
      return hint.relation === "is" ? value === hint.index : value !== hint.index;
    });
  }

  if (hint.type === "room" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const roomId = getCellRoomId(board, position);
      return hint.relation === "is_in" ? roomId === hint.roomId : roomId !== hint.roomId;
    });
  }

  if (hint.type === "edge" && hint.subject.kind === "character" && hint.subject.letter === letter) {
    return domain.filter((position) => {
      const isTop = position.row === 0;
      const isBottom = position.row === board.rows - 1;
      const isLeft = position.col === 0;
      const isRight = position.col === board.cols - 1;
      const isMatch = hint.edgeType === "top" ? isTop : hint.edgeType === "bottom" ? isBottom : hint.edgeType === "left" ? isLeft : hint.edgeType === "right" ? isRight : hint.edgeType === "corner" ? (isTop || isBottom) && (isLeft || isRight) : isTop || isBottom || isLeft || isRight;
      return hint.relation === "is" ? isMatch : !isMatch;
    });
  }

  if ((hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") && hint.subject.kind === "character" && hint.subject.letter === letter && (hint.target.kind === "object" || hint.target.kind === "obstacle")) {
    return domain.filter((position) => {
      const isMatch = relationToTargetCells(board, hint.type, position, hint.target, hint.type === "direction" ? hint.direction : undefined);
      return hint.relation === "is" ? isMatch : !isMatch;
    });
  }

  if (hint.type === "distance" && hint.subject.kind === "character" && hint.subject.letter === letter && (hint.target.kind === "object" || hint.target.kind === "obstacle")) {
    return domain.filter((position) => distanceToTargetCells(board, position, hint.target, hint.axis, hint.distance, hint.relation));
  }

  return domain;
}

function createInitialDomains(board: BoardGrid, hints: Hint[]) {
  const validCells = getValidCells(board);
  const domains = new Map<PlayLetter, SolutionPosition[]>();

  for (const letter of board.activeLetters) {
    let domain = [...validCells];

    for (const hint of hints) {
      domain = filterDomainByHint(board, letter, domain, hint);
    }

    domains.set(letter, domain);
  }

  return domains;
}

function getAssignedPosition(assignment: SolverAssignment, letter: PlayLetter) {
  return assignment[letter] ?? null;
}

function evaluateBinaryHint(hint: Hint, assignment: SolverAssignment) {
  if (hint.type !== "adjacent" && hint.type !== "diagonal" && hint.type !== "direction" && hint.type !== "distance") {
    return true;
  }

  if (hint.subject.kind !== "character" || hint.target.kind !== "character") {
    return true;
  }

  const subjectPosition = getAssignedPosition(assignment, hint.subject.letter);
  const targetPosition = getAssignedPosition(assignment, hint.target.letter);

  if (!subjectPosition || !targetPosition) {
    return true;
  }

  if (hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") {
    const isMatch = relationMatchesPosition(hint.type, subjectPosition, targetPosition, hint.type === "direction" ? hint.direction : undefined);
    return hint.relation === "is" ? isMatch : !isMatch;
  }

  return distanceMatches(subjectPosition, targetPosition, hint.axis, hint.distance, hint.relation);
}

function evaluateFinalHint(board: BoardGrid, hint: Hint, assignment: SolverAssignment) {
  if (hint.type === "murderer_room") {
    const victimRoomId = getCellRoomId(board, getAssignedPosition(assignment, hint.victimLetter));

    if (!victimRoomId) {
      return false;
    }

    const suspectsInRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getAssignedPosition(assignment, letter)) === victimRoomId);
    return suspectsInRoom.length === 1;
  }

  if (hint.type === "room_person_count") {
    const count = board.activeLetters.filter((letter) => getCellRoomId(board, getAssignedPosition(assignment, letter)) === hint.roomId).length;
    return count === hint.count;
  }

  if (hint.type === "room_group_count") {
    const count = board.activeLetters.filter((letter) => {
      const character = board.activeCharacters[letter];
      const position = getAssignedPosition(assignment, letter);
      return character?.gender === hint.group.gender && getCellRoomId(board, position) === hint.roomId;
    }).length;
    return count === hint.count;
  }

  return evaluateBinaryHint(hint, assignment);
}

function partialAssignmentIsValid(hints: Hint[], assignment: SolverAssignment) {
  return hints.every((hint) => evaluateBinaryHint(hint, assignment));
}

function countSolutions(board: BoardGrid, hints: Hint[], limit = SOLUTION_LIMIT) {
  const domains = createInitialDomains(board, hints);

  if (board.activeLetters.some((letter) => (domains.get(letter)?.length ?? 0) === 0)) {
    return 0;
  }

  const orderedLetters = [...board.activeLetters].sort((a, b) => (domains.get(a)?.length ?? 0) - (domains.get(b)?.length ?? 0));
  const assignment: SolverAssignment = {};
  const usedRows = new Set<number>();
  const usedCols = new Set<number>();
  const usedCells = new Set<string>();
  let solutionCount = 0;

  function search(index: number) {
    if (solutionCount >= limit) {
      return;
    }

    if (index >= orderedLetters.length) {
      if (hints.every((hint) => evaluateFinalHint(board, hint, assignment))) {
        solutionCount += 1;
      }
      return;
    }

    const letter = orderedLetters[index];
    const domain = domains.get(letter) ?? [];

    for (const position of domain) {
      const cellKey = `${position.row}:${position.col}`;

      if (usedRows.has(position.row) || usedCols.has(position.col) || usedCells.has(cellKey)) {
        continue;
      }

      assignment[letter] = position;
      usedRows.add(position.row);
      usedCols.add(position.col);
      usedCells.add(cellKey);

      if (partialAssignmentIsValid(hints, assignment)) {
        search(index + 1);
      }

      delete assignment[letter];
      usedRows.delete(position.row);
      usedCols.delete(position.col);
      usedCells.delete(cellKey);

      if (solutionCount >= limit) {
        return;
      }
    }
  }

  search(0);
  return solutionCount;
}

function addRoomCountHint(board: BoardGrid, hints: Hint[], roomId: string | null) {
  if (!roomId) {
    return false;
  }

  const count = board.activeLetters.filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === roomId).length;

  if (count <= 0) {
    return false;
  }

  return addHint(hints, { id: `room-person-count-${roomId}-${count}`, type: "room_person_count", roomId, count });
}

function addRoomCountHints(board: BoardGrid, hints: Hint[]) {
  const victimRoomId = getCellRoomId(board, getPosition(board.solution, "V"));
  const occupiedRoomIds = board.rooms
    .map((room) => room.id)
    .filter((roomId) => board.activeLetters.some((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === roomId));
  const orderedRoomIds = [victimRoomId, ...occupiedRoomIds].filter((roomId, index, values): roomId is string => Boolean(roomId) && values.indexOf(roomId) === index);
  const maxRoomHints = board.difficulty === "easy" ? 4 : board.difficulty === "normal" ? 3 : 2;

  for (const roomId of orderedRoomIds.slice(0, maxRoomHints)) {
    addRoomCountHint(board, hints, roomId);
  }
}

function addPreferredDirectHint(board: BoardGrid, hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, letter: PlayLetter, directIndex: number) {
  const position = getPosition(board.solution, letter);
  const roomId = getCellRoomId(board, position);

  if (!position || !roomId || letter === "V") {
    return false;
  }

  const directHints = directHintsByLetter.get(letter) ?? new Set<DirectHintKind>();

  if (directHints.size >= 1) {
    return false;
  }

  const order: DirectHintKind[] = directIndex % 3 === 0 ? ["room", "row", "col"] : directIndex % 3 === 1 ? ["row", "col", "room"] : ["col", "room", "row"];
  const kind = order[0] ?? "room";
  directHints.add(kind);
  directHintsByLetter.set(letter, directHints);

  if (kind === "row") {
    return addHint(hints, { id: `row-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "row", index: position.row + 1, relation: "is" });
  }

  if (kind === "col") {
    return addHint(hints, { id: `col-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "col", index: position.col + 1, relation: "is" });
  }

  return addHint(hints, { id: `room-${letter}-${roomId}`, type: "room", subject: makeSubject(letter), roomId, relation: "is_in" });
}

function getAnchorCells(board: BoardGrid, includeObstacles: boolean) {
  return board.cells.filter((cell) => cell.isObject && cell.objectType || includeObstacles && cell.isBlocked && cell.obstacleType);
}

function sortAnchorsByDistance(position: SolutionPosition, anchors: BoardCell[]) {
  return [...anchors].sort((a, b) => Math.abs(position.row - a.row) + Math.abs(position.col - a.col) - (Math.abs(position.row - b.row) + Math.abs(position.col - b.col)));
}

function addObjectPlacementHint(board: BoardGrid, hints: Hint[], letter: PlayLetter, position: SolutionPosition, includeObstacles: boolean) {
  if (letter === "V") {
    return false;
  }

  const roomId = getCellRoomId(board, position);
  const anchors = sortAnchorsByDistance(position, getAnchorCells(board, includeObstacles));

  for (const anchor of anchors) {
    const target = makeObjectTarget(anchor, includeObstacles);
    const targetPosition = { row: anchor.row, col: anchor.col };

    if (!target || anchor.roomId !== roomId) {
      continue;
    }

    if (isAdjacent(position, targetPosition)) {
      return addHint(hints, { id: `adjacent-${letter}-${anchor.row}-${anchor.col}`, type: "adjacent", subject: makeSubject(letter), target, relation: "is" });
    }

    if (isDiagonal(position, targetPosition)) {
      return addHint(hints, { id: `diagonal-${letter}-${anchor.row}-${anchor.col}`, type: "diagonal", subject: makeSubject(letter), target, relation: "is" });
    }
  }

  for (const anchor of anchors) {
    const target = makeObjectTarget(anchor, includeObstacles);
    const direction = directionForSameLine(position, { row: anchor.row, col: anchor.col });

    if (target && direction) {
      return addHint(hints, { id: `direction-${letter}-${direction}-${anchor.row}-${anchor.col}`, type: "direction", subject: makeSubject(letter), target, direction, relation: "is" });
    }
  }

  return false;
}

function getPersonRelationCandidates(board: BoardGrid) {
  const result: PersonRelationCandidate[] = [];

  for (const subject of getSuspectLetters(board)) {
    const subjectPosition = getPosition(board.solution, subject);

    if (!subjectPosition) {
      continue;
    }

    for (const target of getSuspectLetters(board)) {
      const targetPosition = getPosition(board.solution, target);

      if (target === subject || !targetPosition) {
        continue;
      }

      const targetHint = makeCharacterTarget(target);
      const direction = directionForSameLine(subjectPosition, targetPosition);

      if (isAdjacent(subjectPosition, targetPosition)) {
        result.push({ hint: { id: `person-adjacent-${subject}-${target}`, type: "adjacent", subject: makeSubject(subject), target: targetHint, relation: "is" }, subject, target, score: 0 });
      } else {
        result.push({ hint: { id: `person-not-adjacent-${subject}-${target}`, type: "adjacent", subject: makeSubject(subject), target: targetHint, relation: "is_not" }, subject, target, score: 4 });
      }

      if (isDiagonal(subjectPosition, targetPosition)) {
        result.push({ hint: { id: `person-diagonal-${subject}-${target}`, type: "diagonal", subject: makeSubject(subject), target: targetHint, relation: "is" }, subject, target, score: 1 });
      } else {
        result.push({ hint: { id: `person-not-diagonal-${subject}-${target}`, type: "diagonal", subject: makeSubject(subject), target: targetHint, relation: "is_not" }, subject, target, score: 5 });
      }

      if (direction) {
        result.push({ hint: { id: `person-direction-${subject}-${target}-${direction}`, type: "direction", subject: makeSubject(subject), target: targetHint, direction, relation: "is" }, subject, target, score: 2 });
      }
    }
  }

  return result.sort((a, b) => a.score - b.score || a.subject.localeCompare(b.subject) || a.target.localeCompare(b.target));
}

function addRelativePersonHint(board: BoardGrid, hints: Hint[], letter: PlayLetter) {
  if (letter === "V") {
    return false;
  }

  return getPersonRelationCandidates(board)
    .filter((candidate) => candidate.subject === letter)
    .some((candidate) => addHint(hints, candidate.hint));
}

function getPersonRelationCount(hints: Hint[]) {
  return hints.filter(usesCharacterTarget).length;
}

function getDependencyChainLength(hints: Hint[]) {
  const graph = new Map<PlayLetter, PlayLetter[]>();

  for (const hint of hints) {
    if (hint.type !== "adjacent" && hint.type !== "diagonal" && hint.type !== "direction") {
      continue;
    }

    if (hint.subject.kind !== "character" || hint.target.kind !== "character") {
      continue;
    }

    graph.set(hint.subject.letter, [...(graph.get(hint.subject.letter) ?? []), hint.target.letter]);
  }

  function walk(letter: PlayLetter, seen: Set<PlayLetter>): number {
    const targets = graph.get(letter) ?? [];
    let best = 0;

    for (const target of targets) {
      if (seen.has(target)) {
        best = Math.max(best, 1);
        continue;
      }

      best = Math.max(best, 1 + walk(target, new Set([...seen, target])));
    }

    return best;
  }

  return Math.max(0, ...[...graph.keys()].map((letter) => walk(letter, new Set([letter]))));
}

function addPersonRelationsUntil(board: BoardGrid, hints: Hint[], minimum: number) {
  const existingKeys = new Set(hints.map(hintKey));

  for (const candidate of getPersonRelationCandidates(board)) {
    if (getPersonRelationCount(hints) >= minimum) {
      break;
    }

    const key = hintKey(candidate.hint);

    if (!existingKeys.has(key)) {
      addHint(hints, candidate.hint);
      existingKeys.add(key);
    }
  }
}

function addDependencyChain(board: BoardGrid, hints: Hint[], minimumLength: number) {
  if (minimumLength <= 0) {
    return;
  }

  const candidates = getPersonRelationCandidates(board);
  const suspects = getSuspectLetters(board);

  for (const start of suspects) {
    const path: PlayLetter[] = [start];

    while (path.length <= minimumLength) {
      const current = path[path.length - 1];
      const next = candidates.find((candidate) => candidate.subject === current && !path.includes(candidate.target));

      if (!next) {
        break;
      }

      addHint(hints, next.hint);
      path.push(next.target);
    }

    if (path.length > minimumLength) {
      return;
    }
  }

  addPersonRelationsUntil(board, hints, minimumLength);
}

function getDirectlySolvableLetters(board: BoardGrid, hints: Hint[]) {
  const result: PlayLetter[] = [];

  for (const letter of getSuspectLetters(board)) {
    let domain = getValidCells(board);

    for (const hint of hints) {
      if (hintCoversLetter(hint, letter) && !usesCharacterTarget(hint)) {
        domain = filterDomainByHint(board, letter, domain, hint);
      }
    }

    if (domain.length === 1) {
      result.push(letter);
    }
  }

  return result;
}

function addCandidate(candidates: Hint[], hint: Hint, existingKeys: Set<string>) {
  const key = hintKey(hint);

  if (!existingKeys.has(key) && !candidates.some((candidate) => hintKey(candidate) === key)) {
    candidates.push(hint);
  }
}

function addObjectCandidates(board: BoardGrid, candidates: Hint[], existingKeys: Set<string>, letter: PlayLetter, position: SolutionPosition, includeObstacles: boolean) {
  for (const anchor of getAnchorCells(board, includeObstacles)) {
    const target = makeObjectTarget(anchor, includeObstacles);

    if (!target) {
      continue;
    }

    const targetPosition = { row: anchor.row, col: anchor.col };

    if (isAdjacent(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-adjacent-${letter}-${anchor.row}-${anchor.col}`, type: "adjacent", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    if (isDiagonal(position, targetPosition)) {
      addCandidate(candidates, { id: `candidate-diagonal-${letter}-${anchor.row}-${anchor.col}`, type: "diagonal", subject: makeSubject(letter), target, relation: "is" }, existingKeys);
    }

    const direction = directionForSameLine(position, targetPosition);

    if (direction) {
      addCandidate(candidates, { id: `candidate-direction-${letter}-${direction}-${anchor.row}-${anchor.col}`, type: "direction", subject: makeSubject(letter), target, direction, relation: "is" }, existingKeys);
    }
  }
}

function addNegativeCandidates(board: BoardGrid, candidates: Hint[], existingKeys: Set<string>, letter: PlayLetter, position: SolutionPosition) {
  for (let row = 0; row < board.rows; row += 1) {
    if (row !== position.row) {
      addCandidate(candidates, { id: `candidate-not-row-${letter}-${row}`, type: "row_column", subject: makeSubject(letter), axis: "row", index: row + 1, relation: "is_not" }, existingKeys);
    }
  }

  for (let col = 0; col < board.cols; col += 1) {
    if (col !== position.col) {
      addCandidate(candidates, { id: `candidate-not-col-${letter}-${col}`, type: "row_column", subject: makeSubject(letter), axis: "col", index: col + 1, relation: "is_not" }, existingKeys);
    }
  }

  const roomId = getCellRoomId(board, position);

  for (const room of board.rooms) {
    if (room.id !== roomId) {
      addCandidate(candidates, { id: `candidate-not-room-${letter}-${room.id}`, type: "room", subject: makeSubject(letter), roomId: room.id, relation: "is_not_in" }, existingKeys);
    }
  }
}

function generateAdditionalHintCandidates(board: BoardGrid, hints: Hint[]) {
  const candidates: Hint[] = [];
  const existingKeys = new Set(hints.map(hintKey));
  const directHintsByLetter = getDirectHintMap(hints);
  const includeObstacles = board.difficulty === "hard";

  for (const relation of getPersonRelationCandidates(board)) {
    addCandidate(candidates, relation.hint, existingKeys);
  }

  for (const letter of getSuspectLetters(board)) {
    const position = getPosition(board.solution, letter);
    const roomId = getCellRoomId(board, position);

    if (!position || !roomId) {
      continue;
    }

    addObjectCandidates(board, candidates, existingKeys, letter, position, includeObstacles);

    if ((directHintsByLetter.get(letter)?.size ?? 0) === 0) {
      addCandidate(candidates, { id: `candidate-room-${letter}-${roomId}`, type: "room", subject: makeSubject(letter), roomId, relation: "is_in" }, existingKeys);
      addCandidate(candidates, { id: `candidate-row-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "row", index: position.row + 1, relation: "is" }, existingKeys);
      addCandidate(candidates, { id: `candidate-col-${letter}`, type: "row_column", subject: makeSubject(letter), axis: "col", index: position.col + 1, relation: "is" }, existingKeys);
    }

    addNegativeCandidates(board, candidates, existingKeys, letter, position);
  }

  return candidates;
}

function canAddHintForHard(board: BoardGrid, hints: Hint[], candidate: Hint) {
  if (!usesCharacterTarget(candidate) && getDirectlySolvableLetters(board, uniqueHints([...hints, candidate])).length > HARD_MAX_DIRECTLY_SOLVABLE) {
    return false;
  }

  return true;
}

function hintPriority(board: BoardGrid, hints: Hint[], hint: Hint) {
  if (usesCharacterTarget(hint)) {
    if (board.difficulty === "hard" && (getPersonRelationCount(hints) < HARD_MIN_PERSON_RELATIONS || getDependencyChainLength(hints) < HARD_MIN_CHAIN_LENGTH)) {
      return 0;
    }

    return board.difficulty === "easy" ? 2 : 1;
  }

  if (usesObjectTarget(hint)) {
    return board.difficulty === "easy" ? 0 : 2;
  }

  if (hint.type === "room_person_count") {
    return 3;
  }

  if ((hint.type === "row_column" && hint.relation === "is") || (hint.type === "room" && hint.relation === "is_in")) {
    return board.difficulty === "hard" ? 8 : 5;
  }

  if ((hint.type === "row_column" && hint.relation === "is_not") || (hint.type === "room" && hint.relation === "is_not_in")) {
    return 4;
  }

  return 6;
}

function improveHintSetUntilUnique(board: BoardGrid, baseHints: Hint[]) {
  let hints = uniqueHints(baseHints);
  let solutionCount = countSolutions(board, hints, SOLUTION_LIMIT);
  const maxExtraHints = board.difficulty === "easy" ? 12 : board.difficulty === "normal" ? 12 : 14;

  for (let attempt = 0; attempt < maxExtraHints && solutionCount !== 1; attempt += 1) {
    const candidates = generateAdditionalHintCandidates(board, hints);
    let bestHint: Hint | null = null;
    let bestCount = solutionCount;
    let bestPriority = Number.MAX_SAFE_INTEGER;

    for (const candidate of candidates) {
      if (board.difficulty === "hard" && !canAddHintForHard(board, hints, candidate)) {
        continue;
      }

      const nextHints = uniqueHints([...hints, candidate]);
      const nextCount = countSolutions(board, nextHints, SOLUTION_LIMIT);
      const priority = hintPriority(board, hints, candidate);

      if (nextCount > 0 && nextCount < bestCount) {
        bestHint = candidate;
        bestCount = nextCount;
        bestPriority = priority;
      } else if (nextCount > 0 && nextCount === bestCount && priority < bestPriority) {
        bestHint = candidate;
        bestCount = nextCount;
        bestPriority = priority;
      }

      if (bestCount === 1 && bestPriority <= 1) {
        break;
      }
    }

    if (!bestHint || bestCount > solutionCount) {
      break;
    }

    hints = uniqueHints([...hints, bestHint]);
    solutionCount = bestCount;
  }

  if (board.difficulty === "hard") {
    addPersonRelationsUntil(board, hints, HARD_MIN_PERSON_RELATIONS);
  }

  return { hints, solutionCount: countSolutions(board, hints, SOLUTION_LIMIT) };
}

function validateHintQuality(board: BoardGrid, hints: Hint[]): HintValidationResult {
  if (hints.some((hint) => hintCoversLetter(hint, "V") && hint.type !== "murderer_room")) {
    return { ok: false, message: "Er staat een directe V-hint in de hintset.", solutionCount: 0 };
  }

  const directHintsByLetter = getDirectHintMap(hints);

  for (const [letter, directHints] of directHintsByLetter.entries()) {
    if (directHints.size > 1) {
      return { ok: false, message: `Er staan te veel directe plaatsingshints voor ${letter}.`, solutionCount: 0 };
    }
  }

  if (board.difficulty !== "hard" && hints.some(usesObstacleTarget)) {
    return { ok: false, message: "Obstakels mogen alleen als hintanker in de moeilijke versie worden gebruikt.", solutionCount: 0 };
  }

  const boardHasObjects = board.cells.some((cell) => cell.isObject && cell.objectType);

  if (boardHasObjects && !hints.some(usesObjectTarget)) {
    return { ok: false, message: "Er zijn objecten op het bord, maar geen bruikbare objecthints gevonden.", solutionCount: 0 };
  }

  if (board.difficulty === "hard") {
    const relationCount = getPersonRelationCount(hints);
    const directlySolvableCount = getDirectlySolvableLetters(board, hints).length;
    const chainLength = getDependencyChainLength(hints);

    if (relationCount < HARD_MIN_PERSON_RELATIONS) {
      return { ok: false, message: `Hard heeft maar ${relationCount} personage-relatiehints.`, solutionCount: 0 };
    }

    if (directlySolvableCount > HARD_MAX_DIRECTLY_SOLVABLE) {
      return { ok: false, message: `Hard heeft ${directlySolvableCount} personages die direct oplosbaar zijn met eigen hints.`, solutionCount: 0 };
    }

    if (chainLength < HARD_MIN_CHAIN_LENGTH) {
      return { ok: false, message: `Hard heeft geen afhankelijkheidsketting van lengte ${HARD_MIN_CHAIN_LENGTH}.`, solutionCount: 0 };
    }
  }

  const victimPosition = getPosition(board.solution, "V");

  if (!victimPosition || !isValidPersonCell(getCell(board, victimPosition.row, victimPosition.col))) {
    return { ok: false, message: "De slachtofferpositie is niet geldig.", solutionCount: 0 };
  }

  const victimRoomId = getCellRoomId(board, victimPosition);
  const suspectsInVictimRoom = getSuspectLetters(board).filter((letter) => getCellRoomId(board, getPosition(board.solution, letter)) === victimRoomId);

  if (suspectsInVictimRoom.length !== 1) {
    return { ok: false, message: `Er staat niet precies 1 verdachte bij V. Kandidaten: ${suspectsInVictimRoom.join(", ") || "geen"}.`, solutionCount: 0 };
  }

  const solutionCount = countSolutions(board, hints, 2);

  if (solutionCount !== 1) {
    return { ok: false, message: solutionCount === 0 ? "De hintset heeft geen geldige oplossing." : "De hintset heeft nog meerdere oplossingen.", solutionCount };
  }

  return { ok: true, message: "ok", murdererLetter: suspectsInVictimRoom[0] ?? "A", victimPosition, solutionCount };
}

function buildEasyHints(board: BoardGrid, hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, suspects: PlayLetter[], includeObstacles: boolean) {
  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return;
    }

    addObjectPlacementHint(board, hints, letter, position, includeObstacles);
    addRelativePersonHint(board, hints, letter);
    addPreferredDirectHint(board, hints, directHintsByLetter, letter, index);
  });
}

function buildNormalHints(board: BoardGrid, hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, suspects: PlayLetter[], includeObstacles: boolean) {
  addDependencyChain(board, hints, Math.min(2, Math.max(1, suspects.length - 1)));
  addPersonRelationsUntil(board, hints, Math.min(3, Math.max(1, suspects.length - 1)));

  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return;
    }

    if (index % 2 === 0) {
      addObjectPlacementHint(board, hints, letter, position, includeObstacles);
    }

    if (index % 3 === 0) {
      addPreferredDirectHint(board, hints, directHintsByLetter, letter, index);
    }
  });
}

function buildHardHints(board: BoardGrid, hints: Hint[], directHintsByLetter: Map<PlayLetter, Set<DirectHintKind>>, suspects: PlayLetter[], includeObstacles: boolean) {
  addDependencyChain(board, hints, Math.min(HARD_MIN_CHAIN_LENGTH, Math.max(0, suspects.length - 1)));
  addPersonRelationsUntil(board, hints, Math.min(HARD_MIN_PERSON_RELATIONS, suspects.length * Math.max(0, suspects.length - 1)));

  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position || index % 2 !== 0) {
      return;
    }

    const before = hints.length;
    addObjectPlacementHint(board, hints, letter, position, includeObstacles);

    if (getDirectlySolvableLetters(board, hints).length > HARD_MAX_DIRECTLY_SOLVABLE) {
      hints.splice(before);
    }
  });

  for (const letter of suspects.slice(0, HARD_MAX_DIRECTLY_SOLVABLE)) {
    addPreferredDirectHint(board, hints, directHintsByLetter, letter, suspects.indexOf(letter));
  }
}

function buildDeductiveHints(board: BoardGrid): PartialBuildResult {
  const hints: Hint[] = [];
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();
  const suspects = getSuspectLetters(board);
  const includeObstacles = board.difficulty === "hard";

  addVictimRule(hints);
  addRoomCountHints(board, hints);

  if (board.difficulty === "easy") {
    buildEasyHints(board, hints, directHintsByLetter, suspects, includeObstacles);
  } else if (board.difficulty === "normal") {
    buildNormalHints(board, hints, directHintsByLetter, suspects, includeObstacles);
  } else {
    buildHardHints(board, hints, directHintsByLetter, suspects, includeObstacles);
  }

  return { hints: uniqueHints(hints) };
}

export function generateHintCandidates(board: BoardGrid) {
  const hints: Hint[] = [];
  const directHintsByLetter = new Map<PlayLetter, Set<DirectHintKind>>();
  const suspects = getSuspectLetters(board);
  const includeObstacles = board.difficulty === "hard";

  if (!board.solution) {
    return hints;
  }

  addVictimRule(hints);
  addRoomCountHints(board, hints);

  if (board.difficulty === "hard") {
    addDependencyChain(board, hints, Math.min(HARD_MIN_CHAIN_LENGTH, Math.max(0, suspects.length - 1)));
    addPersonRelationsUntil(board, hints, Math.min(HARD_MIN_PERSON_RELATIONS, suspects.length * Math.max(0, suspects.length - 1)));
  }

  suspects.forEach((letter, index) => {
    const position = getPosition(board.solution, letter);

    if (!position) {
      return;
    }

    addObjectPlacementHint(board, hints, letter, position, includeObstacles);
    addRelativePersonHint(board, hints, letter);

    if (board.difficulty !== "hard" || index < HARD_MAX_DIRECTLY_SOLVABLE) {
      addPreferredDirectHint(board, hints, directHintsByLetter, letter, index);
    }
  });

  return uniqueHints(hints);
}

export function generateBetaHints(board: BoardGrid): GenerateHintsResult {
  if (!board.solution) {
    return { ok: false, hints: [], candidateCount: 0, message: "Genereer eerst een oplossing voordat je hints maakt." };
  }

  const murdererLetter = findMurderer(board);

  if (!murdererLetter) {
    return { ok: false, hints: [], candidateCount: 0, message: "Er staat niet precies 1 verdachte bij V. Genereer een nieuwe oplossing." };
  }

  const build = buildDeductiveHints(board);
  const improved = improveHintSetUntilUnique(board, build.hints);
  const validation = validateHintQuality(board, improved.hints);

  if (!validation.ok) {
    return {
      ok: false,
      hints: [],
      candidateCount: validation.solutionCount,
      message: `${validation.message} De generator heeft extra hints geprobeerd, maar kon nog geen unieke puzzel maken. Pas kamers of objecten aan en probeer opnieuw.`
    };
  }

  const hardAddition = board.difficulty === "hard" ? ` Hard gebruikt ${getPersonRelationCount(improved.hints)} personage-relatiehints en een ketting van lengte ${getDependencyChainLength(improved.hints)}.` : "";

  return {
    ok: true,
    hints: improved.hints,
    candidateCount: 1,
    message: `${improved.hints.length} hints gegenereerd en intern gevalideerd. De speler heeft nu precies 1 oplossing en de moordenaar blijft verborgen tot de puzzel is ingevuld.${hardAddition}`
  };
}
