import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { applyBuilderTool, DEFAULT_ROOM_COLOR, getCell, hasBoundary, setEdgeBoundary } from "../lib/boardModel";
import { DETECTIVE_OBSTACLES, DETECTIVE_OBJECTS, DETECTIVE_ROOMS, getObjectDefinition, getObstacleDefinition } from "../lib/themeContent";
import type { BoardCell, BoardGrid, BoardObjectTypeId, BoardObstacleTypeId, BuilderToolMode, EdgeSide, Hint, HintTarget, PlayLetter, SolutionPosition } from "../types/board";
import { ObjectIcon } from "./ObjectIcon";

type BoardEditorViewProps = {
  board: BoardGrid;
  activeTool: BuilderToolMode;
  showSolution?: boolean;
  selectedHint?: Hint | null;
  onBoardChange: (board: BoardGrid) => void;
};

type WallOrientation = "horizontal" | "vertical";
type RelationDirection = "above" | "below" | "left_of" | "right_of";

type WallDragState = {
  active: boolean;
  value: boolean;
  lastKey: string | null;
  orientation: WallOrientation | null;
  lineIndex: number | null;
};

const GRID_LINE_COLOR = "#000000";

function roomColor(board: BoardGrid, roomId: string | null) {
  if (!roomId) {
    return DEFAULT_ROOM_COLOR;
  }

  return board.rooms.find((room) => room.id === roomId)?.color ?? DEFAULT_ROOM_COLOR;
}

function roomName(board: BoardGrid, roomId: string | null) {
  if (!roomId) {
    return null;
  }

  return board.rooms.find((room) => room.id === roomId)?.name ?? null;
}

function wallClass(board: BoardGrid, row: number, col: number, side: EdgeSide) {
  return hasBoundary(board, row, col, side) ? "roomWall" : "gridLine";
}

function canToggleSide(board: BoardGrid, row: number, col: number, side: EdgeSide) {
  if (side === "left") {
    return col > 0 && getCell(board, row, col - 1).isActive;
  }

  if (side === "right") {
    return col < board.cols - 1 && getCell(board, row, col + 1).isActive;
  }

  if (side === "top") {
    return row > 0 && getCell(board, row - 1, col).isActive;
  }

  return row < board.rows - 1 && getCell(board, row + 1, col).isActive;
}

function sideOrientation(side: EdgeSide): WallOrientation {
  return side === "top" || side === "bottom" ? "horizontal" : "vertical";
}

function edgeLineIndex(row: number, col: number, side: EdgeSide) {
  if (side === "top") {
    return row;
  }

  if (side === "bottom") {
    return row + 1;
  }

  if (side === "left") {
    return col;
  }

  return col + 1;
}

function physicalEdgeKey(row: number, col: number, side: EdgeSide) {
  if (side === "top") {
    return `h:${row}:${col}`;
  }

  if (side === "bottom") {
    return `h:${row + 1}:${col}`;
  }

  if (side === "left") {
    return `v:${row}:${col}`;
  }

  return `v:${row}:${col + 1}`;
}

function edgeButtonFromPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY);

  if (!element) {
    return null;
  }

  const button = element.closest<HTMLButtonElement>("[data-edge-row][data-edge-col][data-edge-side]");

  if (!button) {
    return null;
  }

  return {
    row: Number(button.dataset.edgeRow),
    col: Number(button.dataset.edgeCol),
    side: button.dataset.edgeSide as EdgeSide
  };
}

function getSolutionLetter(board: BoardGrid, row: number, col: number): PlayLetter | null {
  if (!board.solution) {
    return null;
  }

  for (const letter of board.activeLetters) {
    const position = board.solution[letter];

    if (position?.row === row && position.col === col) {
      return letter;
    }
  }

  return null;
}

function getSolutionPosition(board: BoardGrid, letter: PlayLetter | undefined) {
  if (!letter || !board.solution) {
    return null;
  }

  return board.solution[letter] ?? null;
}

function isSamePosition(a: SolutionPosition | null | undefined, b: SolutionPosition) {
  return Boolean(a && a.row === b.row && a.col === b.col);
}

function isRoomLabelAnchor(board: BoardGrid, roomId: string | null, row: number, col: number) {
  if (!roomId) {
    return false;
  }

  const room = board.rooms.find((candidate) => candidate.id === roomId);
  const firstCell = room?.cells.slice().sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB)[0];

  return Boolean(firstCell && firstCell[0] === row && firstCell[1] === col);
}

function isPersonCandidateCell(cell: BoardCell) {
  return cell.isActive && !cell.isBlocked && !cell.isObject;
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

function getTargetPositions(board: BoardGrid, target: HintTarget) {
  if (target.kind === "character") {
    const position = getSolutionPosition(board, target.letter);
    return position ? [position] : [];
  }

  if (target.kind === "gender") {
    return board.activeLetters
      .filter((letter) => board.activeCharacters[letter]?.gender === target.gender)
      .map((letter) => getSolutionPosition(board, letter))
      .filter((position): position is SolutionPosition => Boolean(position));
  }

  return board.cells.filter((cell) => targetMatchesCell(target, cell)).map((cell) => ({ row: cell.row, col: cell.col }));
}

function getHintTarget(hint: Hint): HintTarget | null {
  if (hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "distance" || hint.type === "direction") {
    return hint.target;
  }

  return null;
}

function getHintSubjectPosition(board: BoardGrid, hint: Hint) {
  const subject = "subject" in hint ? hint.subject : undefined;

  if (subject?.kind === "character") {
    return getSolutionPosition(board, subject.letter);
  }

  return null;
}

function relationMatchesPosition(type: "adjacent" | "diagonal" | "direction", position: SolutionPosition, target: SolutionPosition, direction?: RelationDirection) {
  if (type === "adjacent") {
    return Math.abs(position.row - target.row) + Math.abs(position.col - target.col) === 1;
  }

  if (type === "diagonal") {
    return Math.abs(position.row - target.row) === 1 && Math.abs(position.col - target.col) === 1;
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

function distanceMatchesPosition(position: SolutionPosition, target: SolutionPosition, axis: "row" | "col" | "either", distance: number, relation: "exactly" | "not_exactly" | "at_least" | "at_most") {
  const value = axis === "row" ? Math.abs(position.row - target.row) : axis === "col" ? Math.abs(position.col - target.col) : Math.abs(position.row - target.row) + Math.abs(position.col - target.col);

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

function edgeMatchesPosition(board: BoardGrid, position: SolutionPosition, edgeType: "any_edge" | "top" | "right" | "bottom" | "left" | "corner") {
  const isTop = position.row === 0;
  const isBottom = position.row === board.rows - 1;
  const isLeft = position.col === 0;
  const isRight = position.col === board.cols - 1;

  if (edgeType === "top") {
    return isTop;
  }

  if (edgeType === "right") {
    return isRight;
  }

  if (edgeType === "bottom") {
    return isBottom;
  }

  if (edgeType === "left") {
    return isLeft;
  }

  if (edgeType === "corner") {
    return (isTop || isBottom) && (isLeft || isRight);
  }

  return isTop || isRight || isBottom || isLeft;
}

function getHintCellClasses(board: BoardGrid, hint: Hint | null | undefined, cell: BoardCell) {
  if (!hint || !cell.isActive) {
    return [] as string[];
  }

  const classes: string[] = [];
  const position = { row: cell.row, col: cell.col };
  const target = getHintTarget(hint);
  const targetPositions = target ? getTargetPositions(board, target) : [];
  const subjectPosition = getHintSubjectPosition(board, hint);

  if (targetPositions.some((targetPosition) => isSamePosition(targetPosition, position))) {
    classes.push("hintTargetCell");
  }

  if (isSamePosition(subjectPosition, position)) {
    classes.push("hintSubjectCell");
  }

  if (hint.type === "murderer_room") {
    const victimPosition = getSolutionPosition(board, hint.victimLetter);
    const roomId = hint.roomId ?? (victimPosition ? getCell(board, victimPosition.row, victimPosition.col)?.roomId : null);

    if (roomId && cell.roomId === roomId) {
      classes.push("hintRoomCell");
    }
  }

  if (hint.type === "room_person_count" || hint.type === "room_group_count") {
    if (cell.roomId === hint.roomId) {
      classes.push("hintRoomCell");
    }
  }

  if (hint.type === "room" && cell.roomId === hint.roomId) {
    classes.push(hint.relation === "is_in" ? "hintRoomCell" : "hintLineCell");
  }

  if (hint.type === "row_column") {
    const match = hint.axis === "row" ? cell.row + 1 === hint.index : cell.col + 1 === hint.index;

    if (match) {
      classes.push(hint.relation === "is" ? "hintLineCell" : "hintExcludedCell");
    }
  }

  if (hint.type === "edge" && edgeMatchesPosition(board, position, hint.edgeType)) {
    classes.push(hint.relation === "is" ? "hintLineCell" : "hintExcludedCell");
  }

  if ((hint.type === "adjacent" || hint.type === "diagonal" || hint.type === "direction") && isPersonCandidateCell(cell)) {
    const match = targetPositions.some((targetPosition) => relationMatchesPosition(hint.type, position, targetPosition, hint.type === "direction" ? hint.direction : undefined));

    if (match) {
      classes.push(hint.relation === "is" ? "hintCandidateCell" : "hintExcludedCell");
    }
  }

  if (hint.type === "distance" && isPersonCandidateCell(cell)) {
    const match = targetPositions.some((targetPosition) => distanceMatchesPosition(position, targetPosition, hint.axis, hint.distance, hint.relation));

    if (match) {
      classes.push(hint.relation === "not_exactly" ? "hintExcludedCell" : "hintCandidateCell");
    }
  }

  return Array.from(new Set(classes));
}

export function BoardEditorView({ board, activeTool, showSolution = false, selectedHint = null, onBoardChange }: BoardEditorViewProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(DETECTIVE_ROOMS[0]?.id ?? "living_room");
  const [selectedObjectType, setSelectedObjectType] = useState<BoardObjectTypeId>(DETECTIVE_OBJECTS[0]?.id ?? "chair");
  const [selectedObstacleType, setSelectedObstacleType] = useState<BoardObstacleTypeId>(DETECTIVE_OBSTACLES[0]?.id ?? "table");
  const activeCells = useMemo(() => board.cells.filter((cell) => cell.isActive).length, [board.cells]);
  const latestBoardRef = useRef(board);
  const dragStateRef = useRef<WallDragState>({ active: false, value: false, lastKey: null, orientation: null, lineIndex: null });
  const selectedRoom = DETECTIVE_ROOMS.find((room) => room.id === selectedRoomId) ?? DETECTIVE_ROOMS[0];

  useEffect(() => {
    latestBoardRef.current = board;
  }, [board]);

  useEffect(() => {
    function stopDrag() {
      dragStateRef.current = { active: false, value: false, lastKey: null, orientation: null, lineIndex: null };
    }

    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  function publishBoard(nextBoard: BoardGrid) {
    latestBoardRef.current = nextBoard;
    onBoardChange(nextBoard);
  }

  function handleCellClick(row: number, col: number) {
    if (activeTool === "wall") {
      return;
    }

    publishBoard(
      applyBuilderTool(
        latestBoardRef.current,
        row,
        col,
        activeTool,
        selectedRoom?.color ?? DEFAULT_ROOM_COLOR,
        selectedRoom?.name ?? "Kamer",
        selectedObjectType,
        selectedObstacleType
      )
    );
  }

  function applyEdge(row: number, col: number, side: EdgeSide, value: boolean) {
    const currentBoard = latestBoardRef.current;

    if (!canToggleSide(currentBoard, row, col, side)) {
      return;
    }

    publishBoard(setEdgeBoundary(currentBoard, row, col, side, value));
  }

  function handleEdgeClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleEdgePointerDown(event: PointerEvent<HTMLButtonElement>, row: number, col: number, side: EdgeSide) {
    if (activeTool !== "wall") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const currentBoard = latestBoardRef.current;

    if (!canToggleSide(currentBoard, row, col, side)) {
      return;
    }

    const nextValue = !hasBoundary(currentBoard, row, col, side);
    const orientation = sideOrientation(side);
    dragStateRef.current = {
      active: true,
      value: nextValue,
      lastKey: physicalEdgeKey(row, col, side),
      orientation,
      lineIndex: edgeLineIndex(row, col, side)
    };
    applyEdge(row, col, side, nextValue);
  }

  function handleBoardPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState.active || activeTool !== "wall") {
      return;
    }

    const edge = edgeButtonFromPoint(event.clientX, event.clientY);

    if (!edge || sideOrientation(edge.side) !== dragState.orientation || edgeLineIndex(edge.row, edge.col, edge.side) !== dragState.lineIndex) {
      return;
    }

    const key = physicalEdgeKey(edge.row, edge.col, edge.side);

    if (dragState.lastKey === key) {
      return;
    }

    dragStateRef.current = { ...dragState, lastKey: key };
    applyEdge(edge.row, edge.col, edge.side, dragState.value);
  }

  function handleBoardPointerEnd() {
    dragStateRef.current = { active: false, value: false, lastKey: null, orientation: null, lineIndex: null };
  }

  return (
    <section className="card boardCard editorBoardCard">
      <div className="sectionTitle compact">
        <span>2</span>
        <div>
          <h2>Bord maken</h2>
          <p>{activeCells} actieve cellen. Kamers ontstaan automatisch zodra randen een gesloten gebied vormen.</p>
        </div>
      </div>

      {board.referenceImageUrl && (
        <details className="referenceDetails">
          <summary>Toon referentiefoto</summary>
          <img src={board.referenceImageUrl} alt="Referentiefoto" />
        </details>
      )}

      {activeTool === "color" && (
        <div className="selectionPanel">
          <strong>Kamernaam</strong>
          <div className="tokenGrid roomTokenGrid" aria-label="Kamernamen">
            {DETECTIVE_ROOMS.map((room) => (
              <button
                key={room.id}
                type="button"
                className={selectedRoomId === room.id ? "selectionToken activeSelectionToken" : "selectionToken"}
                style={{ borderColor: room.color }}
                onClick={() => setSelectedRoomId(room.id)}
              >
                <span className="tokenColor" style={{ backgroundColor: room.color }} />
                {room.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === "object" && (
        <div className="selectionPanel">
          <strong>Object voor hints</strong>
          <div className="tokenGrid objectTokenGrid" aria-label="Objecten">
            {DETECTIVE_OBJECTS.map((object) => (
              <button
                key={object.id}
                type="button"
                className={selectedObjectType === object.id ? "selectionToken objectSelectionToken activeSelectionToken" : "selectionToken objectSelectionToken"}
                onClick={() => setSelectedObjectType(object.id)}
              >
                <ObjectIcon type={object.id} className="objectTokenIcon" />
                <span>{object.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === "blocked" && (
        <div className="selectionPanel obstacleSelectionPanel">
          <strong>Obstakel</strong>
          <div className="tokenGrid objectTokenGrid" aria-label="Obstakels">
            {DETECTIVE_OBSTACLES.map((obstacle) => (
              <button
                key={obstacle.id}
                type="button"
                className={selectedObstacleType === obstacle.id ? "selectionToken obstacleSelectionToken activeSelectionToken" : "selectionToken obstacleSelectionToken"}
                onClick={() => setSelectedObstacleType(obstacle.id)}
              >
                <ObjectIcon type={obstacle.id} kind="obstacle" className="objectTokenIcon obstacleTokenIcon" />
                <span>{obstacle.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === "wall" && (
        <div className="tipBox">
          Klik of sleep over randen. Start links-rechts voor een rechte horizontale kamerlijn of boven-beneden voor een rechte verticale kamerlijn.
        </div>
      )}

      {showSolution && board.solution && (
        <div className="tipBox solutionOverlayTip">
          Oplossing wordt op het bord getoond. De rode marker is de moordenaar en staat in dezelfde kamer als het slachtoffer.
        </div>
      )}

      {selectedHint && (
        <div className="tipBox hintOverlayTip">
          Geselecteerde hint wordt gemarkeerd. Goud = relevante rij, kolom of kamer. Blauw = mogelijke cellen bij de hint. Paars = doelobject of doelpersoon.
        </div>
      )}

      <div
        className="manualBoard editorBoard"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, minmax(20px, 1fr))`,
          gridTemplateRows: `repeat(${board.rows}, minmax(20px, 1fr))`,
          aspectRatio: `${board.cols} / ${board.rows}`
        }}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerEnd}
        onPointerCancel={handleBoardPointerEnd}
      >
        {board.cells.map((cell) => {
          const isBlocked = cell.isActive && cell.isBlocked;
          const isObject = cell.isActive && cell.isObject;
          const objectDefinition = getObjectDefinition(cell.objectType);
          const obstacleDefinition = getObstacleDefinition(cell.obstacleType);
          const solutionLetter = showSolution && cell.isActive ? getSolutionLetter(board, cell.row, cell.col) : null;
          const isMurderer = Boolean(solutionLetter && board.murdererLetter === solutionLetter);
          const showRoomName = cell.isActive && isRoomLabelAnchor(board, cell.roomId, cell.row, cell.col);
          const hintClasses = getHintCellClasses(board, selectedHint, cell);
          const cellStyle: CSSProperties = cell.isActive
            ? {
                backgroundColor: isBlocked ? "#9ca3af" : roomColor(board, cell.roomId),
                borderTopColor: GRID_LINE_COLOR,
                borderRightColor: GRID_LINE_COLOR,
                borderBottomColor: GRID_LINE_COLOR,
                borderLeftColor: GRID_LINE_COLOR,
                borderTopWidth: wallClass(board, cell.row, cell.col, "top") === "roomWall" ? 4 : 1,
                borderRightWidth: wallClass(board, cell.row, cell.col, "right") === "roomWall" ? 4 : 1,
                borderBottomWidth: wallClass(board, cell.row, cell.col, "bottom") === "roomWall" ? 4 : 1,
                borderLeftWidth: wallClass(board, cell.row, cell.col, "left") === "roomWall" ? 4 : 1
              }
            : {};

          const className = [
            "manualCell",
            cell.isActive ? "" : "inactiveCell",
            isBlocked ? "blockedCell" : "",
            isObject ? "objectCell" : "",
            solutionLetter ? "solutionCell" : "",
            isMurderer ? "solutionMurdererCell" : "",
            ...hintClasses
          ].filter(Boolean).join(" ");

          return (
            <div
              role="button"
              tabIndex={0}
              className={className}
              key={`${cell.row}-${cell.col}`}
              style={cellStyle}
              onClick={() => handleCellClick(cell.row, cell.col)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  handleCellClick(cell.row, cell.col);
                }
              }}
            >
              {showRoomName && <span className="roomNameLabel">{roomName(board, cell.roomId)}</span>}
              {isObject && (
                <span className="objectMarker" title={objectDefinition?.name ?? "Object"}>
                  <ObjectIcon type={cell.objectType} />
                </span>
              )}
              {isBlocked && (
                <span className="obstacleMarker" title={obstacleDefinition?.name ?? "Stop"}>
                  <ObjectIcon type={cell.obstacleType} kind="obstacle" />
                </span>
              )}
              {solutionLetter && (
                <span className="solutionMarker" title={isMurderer ? `Moordenaar ${solutionLetter}` : `Oplossing ${solutionLetter}`}>
                  {solutionLetter}
                </span>
              )}
              {cell.isActive && activeTool === "wall" && (
                <>
                  <button className="edgeHit edgeTop" type="button" data-edge-row={cell.row} data-edge-col={cell.col} data-edge-side="top" onClick={handleEdgeClick} onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "top")} aria-label="Bovenrand" />
                  <button className="edgeHit edgeRight" type="button" data-edge-row={cell.row} data-edge-col={cell.col} data-edge-side="right" onClick={handleEdgeClick} onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "right")} aria-label="Rechterrand" />
                  <button className="edgeHit edgeBottom" type="button" data-edge-row={cell.row} data-edge-col={cell.col} data-edge-side="bottom" onClick={handleEdgeClick} onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "bottom")} aria-label="Onderrand" />
                  <button className="edgeHit edgeLeft" type="button" data-edge-row={cell.row} data-edge-col={cell.col} data-edge-side="left" onClick={handleEdgeClick} onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "left")} aria-label="Linkerrand" />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="instructionBox">
        <strong>Werkvolgorde</strong>
        <ol>
          <li>Vorm: verwijder cellen die niet bij het bord horen.</li>
          <li>Rand: klik of sleep tussen cellen om kamergrenzen te tekenen.</li>
          <li>Kamer: kies een kamernaam en klik een kamer aan.</li>
          <li>Object: kies een object en klik cellen aan die hints mogen gebruiken.</li>
          <li>Stop: kies een obstakel en klik cellen aan waar niemand mag staan.</li>
        </ol>
      </div>
    </section>
  );
}
