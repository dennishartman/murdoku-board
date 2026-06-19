import type { BoardObjectTypeId, BoardObstacleTypeId } from "../types/board";

export type RoomDefinition = {
  id: string;
  name: string;
  color: string;
};

export type ObjectDefinition = {
  id: BoardObjectTypeId;
  name: string;
  shortLabel: string;
};

export type ObstacleDefinition = {
  id: BoardObstacleTypeId;
  name: string;
  shortLabel: string;
};

export const DETECTIVE_ROOMS: RoomDefinition[] = [
  { id: "living_room", name: "Woonkamer", color: "#fca5a5" },
  { id: "dining_room", name: "Eetkamer", color: "#fdba74" },
  { id: "kitchen", name: "Keuken", color: "#fde68a" },
  { id: "attic", name: "Zolder", color: "#bef264" },
  { id: "study", name: "Studeerkamer", color: "#86efac" },
  { id: "library", name: "Bibliotheek", color: "#67e8f9" },
  { id: "bedroom", name: "Slaapkamer", color: "#93c5fd" },
  { id: "cellar", name: "Kelder", color: "#c4b5fd" },
  { id: "hall", name: "Hal", color: "#f0abfc" }
];

export const DETECTIVE_OBJECTS: ObjectDefinition[] = [
  { id: "chair", name: "Stoel", shortLabel: "Stoel" },
  { id: "bed", name: "Bed", shortLabel: "Bed" },
  { id: "bookcase", name: "Boekenkast", shortLabel: "Boek" },
  { id: "painting", name: "Schilderij", shortLabel: "Schil" },
  { id: "safe", name: "Kluis", shortLabel: "Kluis" },
  { id: "clock", name: "Klok", shortLabel: "Klok" },
  { id: "statue", name: "Beeld", shortLabel: "Beeld" },
  { id: "candle", name: "Kandelaar", shortLabel: "Kand" }
];

export const DETECTIVE_OBSTACLES: ObstacleDefinition[] = [
  { id: "table", name: "Tafel", shortLabel: "Tafel" },
  { id: "plant", name: "Plant", shortLabel: "Plant" },
  { id: "hedge", name: "Heg", shortLabel: "Heg" },
  { id: "cabinet", name: "Kast", shortLabel: "Kast" },
  { id: "piano", name: "Piano", shortLabel: "Piano" },
  { id: "crate", name: "Krat", shortLabel: "Krat" },
  { id: "fireplace", name: "Haard", shortLabel: "Haard" },
  { id: "locked_door", name: "Dichte deur", shortLabel: "Deur" }
];

function findById<T extends { id: string }>(items: T[], id: string | null | undefined) {
  return items.find((item) => item.id === id) ?? null;
}

export function getRoomDefinitionByIndex(index: number): RoomDefinition {
  const fallback = DETECTIVE_ROOMS[0];

  if (!fallback) {
    return { id: "room", name: "Kamer", color: "#e5e7eb" };
  }

  return DETECTIVE_ROOMS[index % DETECTIVE_ROOMS.length] ?? fallback;
}

export function getObjectDefinition(id: BoardObjectTypeId | null | undefined) {
  return findById(DETECTIVE_OBJECTS, id);
}

export function getObstacleDefinition(id: BoardObstacleTypeId | null | undefined) {
  return findById(DETECTIVE_OBSTACLES, id);
}
