import { useMemo, type CSSProperties } from "react";
import { clearCellPlay, DEFAULT_ROOM_COLOR, hasBoundary, PLAY_LETTERS, toggleCellCross, toggleCellFinalLetter, toggleCellLetter } from "../lib/boardModel";
import type { BoardGrid, PlayToolMode } from "../types/board";

type PlayBoardViewProps = {
  board: BoardGrid;
  activeTool: PlayToolMode;
  selectedLetter: string;
  onToolChange: (tool: PlayToolMode) => void;
  onLetterChange: (letter: string) => void;
  onBoardChange: (board: BoardGrid) => void;
  onMainMenu: () => void;
};

const GRID_LINE_COLOR = "#000000";

function roomColor(board: BoardGrid, roomId: string | null) {
  if (!roomId) {
    return DEFAULT_ROOM_COLOR;
  }

  return board.rooms.find((room) => room.id === roomId)?.color ?? DEFAULT_ROOM_COLOR;
}

function wallClass(board: BoardGrid, row: number, col: number, side: "top" | "right" | "bottom" | "left") {
  return hasBoundary(board, row, col, side) ? "roomWall" : "gridLine";
}

function cellBorderStyle(board: BoardGrid, row: number, col: number): CSSProperties {
  return {
    borderTopColor: GRID_LINE_COLOR,
    borderRightColor: GRID_LINE_COLOR,
    borderBottomColor: GRID_LINE_COLOR,
    borderLeftColor: GRID_LINE_COLOR,
    borderTopWidth: wallClass(board, row, col, "top") === "roomWall" ? 4 : 1,
    borderRightWidth: wallClass(board, row, col, "right") === "roomWall" ? 4 : 1,
    borderBottomWidth: wallClass(board, row, col, "bottom") === "roomWall" ? 4 : 1,
    borderLeftWidth: wallClass(board, row, col, "left") === "roomWall" ? 4 : 1
  };
}

export function PlayBoardView({
  board,
  activeTool,
  selectedLetter,
  onToolChange,
  onLetterChange,
  onBoardChange,
  onMainMenu
}: PlayBoardViewProps) {
  const activeCells = useMemo(() => board.cells.filter((cell) => cell.isActive).length, [board.cells]);
  const boardStyle = {
    gridTemplateColumns: `repeat(${board.cols}, minmax(18px, 1fr))`,
    gridTemplateRows: `repeat(${board.rows}, minmax(18px, 1fr))`,
    aspectRatio: `${board.cols} / ${board.rows}`,
    maxWidth: `min(100%, ${(70 * board.cols) / board.rows}dvh)`,
    "--board-cols": board.cols,
    "--board-rows": board.rows
  } as CSSProperties & Record<string, string | number>;

  function selectLetter(letter: string) {
    onLetterChange(letter);
    onToolChange("letter");
  }

  function handleCellClick(row: number, col: number) {
    if (activeTool === "letter") {
      onBoardChange(toggleCellLetter(board, row, col, selectedLetter));
      return;
    }

    if (activeTool === "final") {
      onBoardChange(toggleCellFinalLetter(board, row, col, selectedLetter));
      return;
    }

    if (activeTool === "cross") {
      onBoardChange(toggleCellCross(board, row, col));
      return;
    }

    if (activeTool === "erase") {
      onBoardChange(clearCellPlay(board, row, col));
    }
  }

  return (
    <section className="playScreen">
      <div className="playHeader">
        <div>
          <p className="eyebrow compactEyebrow">Speelmodus</p>
          <h2>Vul het bord in</h2>
          <p>{activeCells} actieve cellen. Kies een letter, kies Mogelijk of Definitief en tik daarna op een cel.</p>
        </div>

        <div className="playHeaderButtons">
          <button className="ghostButton smallButton" type="button" onClick={onMainMenu}>Hoofdmenu</button>
        </div>
      </div>

      <div className="playControls">
        <div className="letterRow" aria-label="Mogelijke letters">
          {PLAY_LETTERS.map((letter) => (
            <button
              className={selectedLetter === letter ? "playTool activeLetter" : "playTool"}
              type="button"
              key={letter}
              onClick={() => selectLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="playActionRow">
          <button className={activeTool === "letter" ? "playTool active" : "playTool"} type="button" onClick={() => onToolChange("letter")}>Mogelijk</button>
          <button className={activeTool === "final" ? "playTool active" : "playTool"} type="button" onClick={() => onToolChange("final")}>Definitief</button>
          <button className={activeTool === "cross" ? "playTool active" : "playTool"} type="button" onClick={() => onToolChange("cross")}>X</button>
          <button className={activeTool === "erase" ? "playTool active" : "playTool"} type="button" onClick={() => onToolChange("erase")}>Wis</button>
        </div>
      </div>

      <div className="playBoardWrap">
        <div
          className="manualBoard playBoard"
          style={boardStyle}
        >
          {board.cells.map((cell) => {
            if (!cell.isActive) {
              return <div key={`${cell.row}-${cell.col}`} className="manualCell inactiveCell playCell" />;
            }

            const isBlocked = cell.isBlocked;
            const isObject = cell.isObject;
            const style: CSSProperties = {
              backgroundColor: isBlocked ? "#9ca3af" : roomColor(board, cell.roomId),
              ...cellBorderStyle(board, cell.row, cell.col)
            };

            const className = [
              "manualCell",
              "playCell",
              isBlocked ? "blockedCell" : "",
              isObject ? "objectCell" : "",
              cell.isCrossed ? "crossedCell" : ""
            ].filter(Boolean).join(" ");

            return (
              <div
                key={`${cell.row}-${cell.col}`}
                className={className}
                style={style}
                role="button"
                tabIndex={0}
                onClick={() => handleCellClick(cell.row, cell.col)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleCellClick(cell.row, cell.col);
                  }
                }}
              >
                {isObject && <span className="objectMarker" />}
                {!isBlocked && !cell.isCrossed && cell.finalLetter && (
                  <span className="finalLetter" aria-hidden="true">{cell.finalLetter}</span>
                )}
                {!isBlocked && !cell.isCrossed && !cell.finalLetter && (
                  <div className="miniSlotGrid" aria-hidden="true">
                    {cell.playMarks.map((mark, index) => (
                      <span className="miniSlot" key={index}>{mark}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
