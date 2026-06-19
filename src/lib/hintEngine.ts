import { getObjectDefinition, getObstacleDefinition } from "./themeContent";
import type { ActiveCharacterSet, BoardGrid, BoardObjectTypeId, BoardObstacleTypeId, CharacterGender, Hint, HintSubject, HintTarget } from "../types/board";

const genderSingular: Record<CharacterGender, string> = {
  male: "man",
  female: "vrouw",
  neutral: "persoon"
};

const genderPlural: Record<CharacterGender, string> = {
  male: "mannen",
  female: "vrouwen",
  neutral: "personen"
};

const objectArticle: Record<BoardObjectTypeId, string> = {
  chair: "de",
  bed: "het",
  bookcase: "de",
  painting: "het",
  safe: "de",
  clock: "de",
  statue: "het",
  candle: "de"
};

const obstacleArticle: Record<BoardObstacleTypeId, string> = {
  table: "de",
  plant: "de",
  hedge: "de",
  cabinet: "de",
  piano: "de",
  crate: "het",
  fireplace: "de",
  locked_door: "de"
};

function genderLabel(gender: CharacterGender, count = 2) {
  return count === 1 ? genderSingular[gender] : genderPlural[gender];
}

function personLabel(count: number) {
  return count === 1 ? "personage" : "personages";
}

function lowerFirst(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

function describeSubject(subject: HintSubject, activeCharacters: ActiveCharacterSet) {
  if (subject.kind === "character") {
    return activeCharacters[subject.letter]?.name ?? subject.letter;
  }

  return `Een ${genderSingular[subject.gender]}`;
}

function describeRoom(board: BoardGrid, roomId: string) {
  const room = board.rooms.find((candidate) => candidate.id === roomId);

  if (room?.name) {
    return `de ${lowerFirst(room.name)}`;
  }

  const index = board.rooms.findIndex((candidate) => candidate.id === roomId);

  if (index >= 0) {
    return `kamer ${index + 1}`;
  }

  return roomId;
}

function describeTargetRoom(board: BoardGrid, roomId: string | null | undefined) {
  if (!roomId) {
    return "";
  }

  return ` in ${describeRoom(board, roomId)}`;
}

function describeTarget(target: HintTarget, activeCharacters: ActiveCharacterSet, board: BoardGrid) {
  if (target.kind === "character") {
    return activeCharacters[target.letter]?.name ?? target.letter;
  }

  if (target.kind === "gender") {
    return `een ${genderSingular[target.gender]}`;
  }

  if (target.kind === "object") {
    if (target.objectType) {
      const name = getObjectDefinition(target.objectType)?.name.toLowerCase() ?? "object";
      return `${objectArticle[target.objectType]} ${name}${describeTargetRoom(board, target.roomId)}`;
    }

    return "een object";
  }

  if (target.obstacleType) {
    const name = getObstacleDefinition(target.obstacleType)?.name.toLowerCase() ?? "obstakel";
    return `${obstacleArticle[target.obstacleType]} ${name}${describeTargetRoom(board, target.roomId)}`;
  }

  return "een obstakel";
}

function describeEdge(edgeType: "any_edge" | "top" | "right" | "bottom" | "left" | "corner") {
  if (edgeType === "corner") {
    return "in een hoek van het bord";
  }

  if (edgeType === "top") {
    return "aan de bovenrand";
  }

  if (edgeType === "right") {
    return "aan de rechterrand";
  }

  if (edgeType === "bottom") {
    return "aan de onderrand";
  }

  if (edgeType === "left") {
    return "aan de linkerrand";
  }

  return "langs de rand van het bord";
}

function describeDirection(direction: "above" | "below" | "left_of" | "right_of") {
  if (direction === "above") {
    return "boven";
  }

  if (direction === "below") {
    return "onder";
  }

  if (direction === "left_of") {
    return "links van";
  }

  return "rechts van";
}

function describeDistanceRelation(relation: "exactly" | "not_exactly" | "at_least" | "at_most") {
  if (relation === "not_exactly") {
    return "niet precies";
  }

  if (relation === "at_least") {
    return "minimaal";
  }

  if (relation === "at_most") {
    return "maximaal";
  }

  return "precies";
}

function describeAxis(axis: "row" | "col" | "either", distance: number) {
  if (axis === "row") {
    return distance === 1 ? "rij" : "rijen";
  }

  if (axis === "col") {
    return distance === 1 ? "kolom" : "kolommen";
  }

  return distance === 1 ? "stap" : "stappen";
}

export function describeHint(hint: Hint, board: BoardGrid, activeCharacters: ActiveCharacterSet) {
  if (hint.type === "murderer_room") {
    const victimName = activeCharacters[hint.victimLetter]?.name ?? hint.victimLetter;
    return `${victimName} stond met de moordenaar in dezelfde kamer.`;
  }

  if (hint.type === "room_person_count") {
    return `In ${describeRoom(board, hint.roomId)} staan ${hint.count} ${personLabel(hint.count)}.`;
  }

  if (hint.type === "row_column") {
    const axisLabel = hint.axis === "row" ? "rij" : "kolom";
    const relationText = hint.relation === "is" ? "bevindt zich in" : "bevindt zich niet in";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${axisLabel} ${hint.index}.`;
  }

  if (hint.type === "room") {
    const relationText = hint.relation === "is_in" ? "staat in" : "staat niet in";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeRoom(board, hint.roomId)}.`;
  }

  if (hint.type === "adjacent") {
    const relationText = hint.relation === "is" ? "staat naast" : "staat niet naast";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeTarget(hint.target, activeCharacters, board)}.`;
  }

  if (hint.type === "diagonal") {
    const relationText = hint.relation === "is" ? "staat diagonaal van" : "staat niet diagonaal van";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeTarget(hint.target, activeCharacters, board)}.`;
  }

  if (hint.type === "edge") {
    const relationText = hint.relation === "is" ? "staat" : "staat niet";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeEdge(hint.edgeType)}.`;
  }

  if (hint.type === "distance") {
    return `${describeSubject(hint.subject, activeCharacters)} staat ${describeDistanceRelation(hint.relation)} ${hint.distance} ${describeAxis(hint.axis, hint.distance)} van ${describeTarget(hint.target, activeCharacters, board)}.`;
  }

  if (hint.type === "direction") {
    const relationText = hint.relation === "is" ? "staat" : "staat niet";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeDirection(hint.direction)} ${describeTarget(hint.target, activeCharacters, board)}.`;
  }

  if (hint.type === "room_group_count") {
    const roomText = describeRoom(board, hint.roomId);
    const countLabel = genderLabel(hint.group.gender, hint.count);

    if (hint.subject && hint.countMode === "other_than_subject") {
      return `${describeSubject(hint.subject, activeCharacters)} staat met ${hint.count} andere ${countLabel} in ${roomText}.`;
    }

    if (hint.subject && hint.countMode === "including_subject") {
      return `${describeSubject(hint.subject, activeCharacters)} staat in ${roomText} met in totaal ${hint.count} ${countLabel}.`;
    }

    return `In ${roomText} staan ${hint.count} ${countLabel}.`;
  }

  return "Onbekende hint.";
}

export function describeHints(hints: Hint[], board: BoardGrid, activeCharacters: ActiveCharacterSet) {
  return hints.map((hint) => describeHint(hint, board, activeCharacters));
}
