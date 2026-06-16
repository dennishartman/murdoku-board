export type BuilderToolMode = "shape" | "wall" | "color" | "object" | "blocked";

export type PlayToolMode = "letter" | "final" | "cross" | "erase";

export type ToolMode = BuilderToolMode | PlayToolMode;

export type EdgeSide = "top" | "right" | "bottom" | "left";

export type BoardCell = {
  row: number;
  col: number;
  isActive: boolean;
  roomId: string | null;
  isBlocked: boolean;
  isObject: boolean;
  isCrossed: boolean;
  finalLetter: string | null;
  playMarks: Array<string | null>;
};

export type BoardRoom = {
  id: string;
  color: string;
  cells: Array<[number, number]>;
};

export type BoardGrid = {
  rows: number;
  cols: number;
  cells: BoardCell[];
  rooms: BoardRoom[];
  verticalWalls: boolean[][];
  horizontalWalls: boolean[][];
  referenceImageUrl: string | null;
};

export type SavedBoard = {
  id: string;
  name: string;
  savedAt: string;
  board: BoardGrid;
};
