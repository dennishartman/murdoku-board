import { getObjectDefinition } from "./themeContent";
import type { ActiveCharacterSet, BoardGrid, CharacterGender, Hint, HintSubject, HintTarget } from "../types/board";

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

function genderLabel(gender: CharacterGender, count = 2) {
  return count === 1 ? genderSingular[gender] : genderPlural[gender];
}

function describeSubject(subject: HintSubject, activeCharacters: ActiveCharacterSet) {
  if (subject.kind === "character") {
    return activeCharacters[subject.letter]?.name ?? subject.letter;
  }

  return `Een ${genderSingular[subject.gender]}`;
}

function describeTarget(target: HintTarget, activeCharacters: ActiveCharacterSet) {
  if (target.kind === "character") {
    return activeCharacters[target.letter]?.name ?? target.letter;
  }

  if (target.kind === "gender") {
    return `een ${genderSingular[target.gender]}`;
  }

  if (target.objectType) {
    return `de ${getObjectDefinition(target.objectType)?.name.toLowerCase() ?? "het object"}`;
  }

  return "een object";
}

function describeRoom(board: BoardGrid, roomId: string) {
  const room = board.rooms.find((candidate) => candidate.id === roomId);

  if (room?.name) {
    return room.name;
  }

  const index = board.rooms.findIndex((candidate) => candidate.id === roomId);

  if (index >= 0) {
    return `kamer ${index + 1}`;
  }

  return roomId;
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
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeTarget(hint.target, activeCharacters)}.`;
  }

  if (hint.type === "diagonal") {
    const relationText = hint.relation === "is" ? "staat diagonaal van" : "staat niet diagonaal van";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeTarget(hint.target, activeCharacters)}.`;
  }

  if (hint.type === "edge") {
    const relationText = hint.relation === "is" ? "staat" : "staat niet";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeEdge(hint.edgeType)}.`;
  }

  if (hint.type === "distance") {
    return `${describeSubject(hint.subject, activeCharacters)} staat ${describeDistanceRelation(hint.relation)} ${hint.distance} ${describeAxis(hint.axis, hint.distance)} van ${describeTarget(hint.target, activeCharacters)}.`;
  }

  if (hint.type === "direction") {
    const relationText = hint.relation === "is" ? "staat" : "staat niet";
    return `${describeSubject(hint.subject, activeCharacters)} ${relationText} ${describeDirection(hint.direction)} ${describeTarget(hint.target, activeCharacters)}.`;
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
