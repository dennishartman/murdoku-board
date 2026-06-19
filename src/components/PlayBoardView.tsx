import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { clearCellPlay, DEFAULT_ROOM_COLOR, hasBoundary, PLAY_LETTERS, toggleCellCross, toggleCellFinalLetter, toggleCellLetter } from "../lib/boardModel";
import { ensureActiveCharacterSet } from "../lib/characterPool";
import { describeHints } from "../lib/hintEngine";
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

type PlayActionIconName = "pencil" | "check" | "cross" | "eraser";

type PlayAction = {
  mode: PlayToolMode;
  label: string;
  icon: PlayActionIconName;
};

const GRID_LINE_COLOR = "#000000";

const PLAY_ACTIONS: PlayAction[] = [
  { mode: "letter", label: "Aantekening", icon: "pencil" },
  { mode: "final", label: "Plaatsen", icon: "check" },
  { mode: "cross", label: "Kruis", icon: "cross" },
  { mode: "erase", label: "Wissen", icon: "eraser" }
];

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

function PlayActionIcon({ icon }: { icon: PlayActionIconName }) {
  if (icon === "pencil") {
    return (
      <svg className="playToolIcon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 17.5V21h3.5L18.1 10.4l-3.5-3.5L4 17.5Z" />
        <path d="m15.7 5.8 1.4-1.4a1.7 1.7 0 0 1 2.4 0l.1.1a1.7 1.7 0 0 1 0 2.4l-1.4 1.4" />
      </svg>
    );
  }

  if (icon === "check") {
    return (
      <svg className="playToolIcon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12.5 4.2 4.2L19.5 6.4" />
      </svg>
    );
  }

  if (icon === "cross") {
    return (
      <svg className="playToolIcon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="M17.5 6.5 6.5 17.5" />
      </svg>
    );
  }

  return (
    <svg className="playToolIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4.7 14.5 8.6-8.6a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8l-7.2 7.2H6.5l-1.8-1.8a2 2 0 0 1 0-1.6Z" />
      <path d="M11.2 7.9 16.1 12.8" />
      <path d="M6.5 17.9H20" />
    </svg>
  );
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);
  const activeCells = useMemo(() => board.cells.filter((cell) => cell.isActive).length, [board.cells]);
  const activeCharacters = useMemo(() => ensureActiveCharacterSet(board.selectedThemeId, board.activeCharacters), [board.selectedThemeId, board.activeCharacters]);
  const finalLetters = useMemo(
    () => new Set(board.cells.map((cell) => cell.finalLetter).filter((letter): letter is string => Boolean(letter))),
    [board.cells]
  );
  const hintTexts = useMemo(() => describeHints(board.hints, board, activeCharacters), [board, activeCharacters]);
  const boardStyle = {
    gridTemplateColumns: `repeat(${board.cols}, minmax(18px, 1fr))`,
    gridTemplateRows: `repeat(${board.rows}, minmax(18px, 1fr))`,
    aspectRatio: `${board.cols} / ${board.rows}`,
    maxWidth: `min(100%, ${(58 * board.cols) / board.rows}dvh)`,
    "--board-cols": board.cols,
    "--board-rows": board.rows
  } as CSSProperties & Record<string, string | number>;

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  function selectLetter(letter: string) {
    onLetterChange(letter);
  }

  function showToast(message: string) {
    setToastMessage(null);
    window.setTimeout(() => {
      setToastMessage(message);
    }, 0);
  }

  function handleCellClick(row: number, col: number) {
    if (activeTool === "letter") {
      onBoardChange(toggleCellLetter(board, row, col, selectedLetter));
      return;
    }

    if (activeTool === "final") {
      const targetCell = board.cells.find((cell) => cell.row === row && cell.col === col);
      const selectedLetterAlreadyPlaced = board.cells.some((cell) => cell.finalLetter === selectedLetter && (cell.row !== row || cell.col !== col));

      if (targetCell?.finalLetter !== selectedLetter && selectedLetterAlreadyPlaced) {
        showToast(`Letter ${selectedLetter} is al geplaatst.`);
        return;
      }

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
          <p className="eyebrow compactEyebrow">Speelmodus beta</p>
          <h2>Vul het bord in</h2>
          <p>{activeCells} actieve cellen. Kies een personage, kies Aantekening of Plaatsen en tik daarna op een cel.</p>
        </div>

        <div className="playHeaderButtons">
          <button className="ghostButton smallButton" type="button" onClick={() => setHintsOpen((open) => !open)}>{hintsOpen ? "Verberg hints" : "Hints"}</button>
          <button className="ghostButton smallButton" type="button" onClick={onMainMenu}>Hoofdmenu</button>
        </div>
      </div>

      {toastMessage && <div className="playToast" role="status">{toastMessage}</div>}

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
                      <span className="miniSlot" key={index}>{mark && !finalLetters.has(mark) ? mark : null}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="playControls">
        <div className="characterRow" aria-label="Personages">
          {PLAY_LETTERS.map((letter) => {
            const character = activeCharacters[letter];
            const portraitStyle = { "--character-accent": character.accentColor } as CSSProperties & Record<string, string>;

            return (
              <button
                className={selectedLetter === letter ? "characterChip selectedCharacter" : "characterChip"}
                type="button"
                key={character.id}
                onClick={() => selectLetter(letter)}
                aria-label={`Kies ${character.name} voor letter ${letter}`}
              >
                <span className="characterPortrait" style={portraitStyle} />
                <span className="characterName">{character.name}</span>
              </button>
            );
          })}
        </div>

        <div className="playActionRow" aria-label="Acties">
          {PLAY_ACTIONS.map((action) => (
            <button
              className={activeTool === action.mode ? "playTool active actionTool" : "playTool actionTool"}
              type="button"
              key={action.mode}
              onClick={() => onToolChange(action.mode)}
            >
              <PlayActionIcon icon={action.icon} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {hintsOpen && (
          <div className="hintPanel">
            <div className="hintPanelHeader">
              <strong>Hints beta</strong>
              <span>{hintTexts.length} regels</span>
            </div>

            {hintTexts.length > 0 ? (
              <ol>
                {hintTexts.map((hintText, index) => (
                  <li key={`${hintText}-${index}`}>{hintText}</li>
                ))}
              </ol>
            ) : (
              <p>Nog geen hints gekoppeld aan dit bord. De beta-engine ondersteunt al rij, kolom, kamer, naast, diagonaal, rand, afstand en gender-aantallen.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
