export type BuilderToolMode = "shape" | "wall" | "color" | "object" | "blocked";

export type PlayToolMode = "letter" | "final" | "cross" | "erase";

export type ToolMode = BuilderToolMode | PlayToolMode;

export type EdgeSide = "top" | "right" | "bottom" | "left";

export type PlayLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "V";

export type CharacterGender = "male" | "female" | "neutral";

export type CharacterTheme = {
  id: string;
  name: string;
  description: string;
};

export type CharacterProfile = {
  id: string;
  themeId: string;
  letter: PlayLetter;
  name: string;
  gender: CharacterGender;
  portraitUrl: string | null;
  accentColor: string;
};

export type ActiveCharacter = {
  id: string;
  themeId: string;
  letter: PlayLetter;
  name: string;
  gender: CharacterGender;
  portraitUrl: string | null;
  accentColor: string;
};

export type ActiveCharacterSet = Record<PlayLetter, ActiveCharacter>;

export type HintSubject =
  | { kind: "character"; letter: PlayLetter }
  | { kind: "gender"; gender: CharacterGender };

export type HintTarget =
  | { kind: "character"; letter: PlayLetter }
  | { kind: "gender"; gender: CharacterGender }
  | { kind: "object" };

export type RowColumnHint = {
  id: string;
  type: "row_column";
  subject: HintSubject;
  axis: "row" | "col";
  index: number;
  relation: "is" | "is_not";
};

export type RoomHint = {
  id: string;
  type: "room";
  subject: HintSubject;
  roomId: string;
  relation: "is_in" | "is_not_in";
};

export type AdjacentHint = {
  id: string;
  type: "adjacent";
  subject: HintSubject;
  target: HintTarget;
  relation: "is" | "is_not";
};

export type DiagonalHint = {
  id: string;
  type: "diagonal";
  subject: HintSubject;
  target: HintTarget;
  relation: "is" | "is_not";
};

export type EdgeHint = {
  id: string;
  type: "edge";
  subject: HintSubject;
  edgeType: "any_edge" | "top" | "right" | "bottom" | "left" | "corner";
  relation: "is" | "is_not";
};

export type DistanceHint = {
  id: string;
  type: "distance";
  subject: HintSubject;
  target: HintTarget;
  axis: "row" | "col" | "either";
  distance: number;
  relation: "exactly" | "not_exactly" | "at_least" | "at_most";
};

export type DirectionHint = {
  id: string;
  type: "direction";
  subject: HintSubject;
  target: HintTarget;
  direction: "above" | "below" | "left_of" | "right_of";
  relation: "is" | "is_not";
};

export type RoomGroupCountHint = {
  id: string;
  type: "room_group_count";
  subject?: HintSubject;
  roomId: string;
  group: {
    kind: "gender";
    gender: CharacterGender;
  };
  countMode: "including_subject" | "other_than_subject" | "total";
  count: number;
};

export type Hint = RowColumnHint | RoomHint | AdjacentHint | DiagonalHint | EdgeHint | DistanceHint | DirectionHint | RoomGroupCountHint;

export type BoardCell = {
  row: number;
  col: number;
  isActive: boolean;
  roomId: string | null;
  isBlocked: boolean;
  isObject: boolean;
  isCrossed: boolean;
  manualCross: boolean;
  autoCrossSources: string[];
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
  selectedThemeId: string;
  activeCharacters: ActiveCharacterSet;
  hints: Hint[];
};

export type SavedBoard = {
  id: string;
  name: string;
  savedAt: string;
  board: BoardGrid;
};
