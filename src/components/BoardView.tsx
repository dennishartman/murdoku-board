import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { applyBuilderTool, getCell, hasBoundary, ROOM_COLORS, setEdgeBoundary } from "../lib/boardModel";
import type { BoardGrid, BuilderToolMode, EdgeSide } from "../types/board";

type BoardEditorViewProps = {
  board: BoardGrid;
  activeTool: BuilderToolMode;
  onBoardChange: (board: BoardGrid) => void;
};

type WallOrientation = "horizontal" | "vertical";

type WallDragState = {
  active: boolean;
  value: boolean;
  lastKey: string | null;
  orientation: WallOrientation | null;
  lineIndex: number | null;
};

function roomColor(board: BoardGrid, roomId: string | null) {
  if (!roomId) {
    return "#111827";
  }

  return board.rooms.find((room) => room.id === roomId)?.color ?? "#ffffff";
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

export function BoardEditorView({ board, activeTool, onBoardChange }: BoardEditorViewProps) {
  const [selectedColor, setSelectedColor] = useState(ROOM_COLORS[0]);
  const activeCells = useMemo(() => board.cells.filter((cell) => cell.isActive).length, [board.cells]);
  const latestBoardRef = useRef(board);
  const dragStateRef = useRef<WallDragState>({ active: false, value: false, lastKey: null, orientation: null, lineIndex: null });

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

    publishBoard(applyBuilderTool(latestBoardRef.current, row, col, activeTool, selectedColor));
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
        <div className="colorPanel">
          <div className="colorPalette" aria-label="Kamer kleur">
            {ROOM_COLORS.map((color, index) => (
              <button
                key={color}
                type="button"
                className={selectedColor === color ? "colorDot selected" : "colorDot"}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Standaard kleur ${index + 1}`}
              />
            ))}
          </div>

          <label className="customColorPicker">
            Eigen kleur
            <input type="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} />
          </label>
        </div>
      )}

      {activeTool === "wall" && (
        <div className="tipBox">
          Klik of sleep over randen. Start links-rechts voor een rechte horizontale kamerlijn of boven-beneden voor een rechte verticale kamerlijn.
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
          const cellStyle: CSSProperties = cell.isActive
            ? {
                backgroundColor: isBlocked ? "#9ca3af" : roomColor(board, cell.roomId),
                borderTopColor: wallClass(board, cell.row, cell.col, "top") === "roomWall" ? "#111827" : "#94a3b8",
                borderRightColor: wallClass(board, cell.row, cell.col, "right") === "roomWall" ? "#111827" : "#94a3b8",
                borderBottomColor: wallClass(board, cell.row, cell.col, "bottom") === "roomWall" ? "#111827" : "#94a3b8",
                borderLeftColor: wallClass(board, cell.row, cell.col, "left") === "roomWall" ? "#111827" : "#94a3b8",
                borderTopWidth: wallClass(board, cell.row, cell.col, "top") === "roomWall" ? 4 : 1,
                borderRightWidth: wallClass(board, cell.row, cell.col, "right") === "roomWall" ? 4 : 1,
                borderBottomWidth: wallClass(board, cell.row, cell.col, "bottom") === "roomWall" ? 4 : 1,
                borderLeftWidth: wallClass(board, cell.row, cell.col, "left") === "roomWall" ? 4 : 1
              }
            : {};

          const className = ["manualCell", cell.isActive ? "" : "inactiveCell", isBlocked ? "blockedCell" : "", isObject ? "objectCell" : ""].filter(Boolean).join(" ");

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
              {isObject && <span className="objectMarker" />}
              {cell.isActive && activeTool === "wall" && (
                <>
                  <button
                    className="edgeHit edgeTop"
                    type="button"
                    data-edge-row={cell.row}
                    data-edge-col={cell.col}
                    data-edge-side="top"
                    onClick={handleEdgeClick}
                    onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "top")}
                    aria-label="Bovenrand"
                  />
                  <button
                    className="edgeHit edgeRight"
                    type="button"
                    data-edge-row={cell.row}
                    data-edge-col={cell.col}
                    data-edge-side="right"
                    onClick={handleEdgeClick}
                    onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "right")}
                    aria-label="Rechterrand"
                  />
                  <button
                    className="edgeHit edgeBottom"
                    type="button"
                    data-edge-row={cell.row}
                    data-edge-col={cell.col}
                    data-edge-side="bottom"
                    onClick={handleEdgeClick}
                    onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "bottom")}
                    aria-label="Onderrand"
                  />
                  <button
                    className="edgeHit edgeLeft"
                    type="button"
                    data-edge-row={cell.row}
                    data-edge-col={cell.col}
                    data-edge-side="left"
                    onClick={handleEdgeClick}
                    onPointerDown={(event) => handleEdgePointerDown(event, cell.row, cell.col, "left")}
                    aria-label="Linkerrand"
                  />
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
          <li>Kleur: klik een kamer aan om die kamer een kleur te geven.</li>
          <li>Object: klik beschikbare objectcellen aan. Deze krijgen een afgerond vierkant.</li>
          <li>Stop: klik cellen met obstakels aan. Deze worden grijs in het speelbord.</li>
        </ol>
      </div>
    </section>
  );
}
