import { useState } from "react";
import { BoardEditorView } from "./components/BoardView";
import { PlayBoardView } from "./components/PlayBoardView";
import { SetupPanel } from "./components/SetupPanel";
import { ToolBar } from "./components/ToolBar";
import { createBoardForDifficulty, DEFAULT_DIFFICULTY, getBoardSizeRangeLabel, normalizeBoard, PLAY_LETTERS } from "./lib/boardModel";
import { loadBoard, saveBoard } from "./lib/storage";
import type { BoardGrid, BuilderToolMode, PlayToolMode, PuzzleDifficulty } from "./types/board";

type ScreenMode = "setup" | "edit" | "play";

function difficultyLabel(difficulty: PuzzleDifficulty) {
  if (difficulty === "easy") {
    return "Makkelijk";
  }

  if (difficulty === "hard") {
    return "Moeilijk";
  }

  return "Normaal";
}

export function App() {
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(DEFAULT_DIFFICULTY);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardGrid | null>(null);
  const [mode, setMode] = useState<ScreenMode>("setup");
  const [activeBuilderTool, setActiveBuilderTool] = useState<BuilderToolMode>("shape");
  const [activePlayTool, setActivePlayTool] = useState<PlayToolMode>("letter");
  const [selectedLetter, setSelectedLetter] = useState<string>(PLAY_LETTERS[0]);
  const [status, setStatus] = useState("Kies een moeilijkheid en maak daarna automatisch een passend bord.");

  function handleCreateBoard() {
    const newBoard = createBoardForDifficulty(difficulty, referenceImageUrl);
    setBoard(newBoard);
    setMode("edit");
    setActiveBuilderTool("shape");
    setSelectedLetter(newBoard.activeLetters[0] ?? PLAY_LETTERS[0]);
    setStatus(`Basisgrid gemaakt: ${newBoard.rows}x${newBoard.cols}. Elke rij en kolom krijgt 1 personage: ${newBoard.activeLetters.length - 1} verdachten en 1 slachtoffer (${difficultyLabel(newBoard.difficulty)}).`);
  }

  async function handleSave() {
    if (!board) {
      return;
    }

    try {
      const saved = await saveBoard(board, "Murdoku bord");
      const imageText = saved.board.referenceImageUrl ? " inclusief referentiefoto" : " zonder referentiefoto";
      setStatus(`Bord opgeslagen op dit apparaat${imageText}.`);
    } catch {
      setStatus("Opslaan is mislukt. Probeer eventueel de referentiefoto te verwijderen en bewaar opnieuw.");
    }
  }

  async function handleLoadSaved() {
    const saved = await loadBoard();

    if (!saved) {
      setStatus("Geen opgeslagen bord gevonden.");
      return;
    }

    const loadedBoard = normalizeBoard(saved.board);
    setBoard(loadedBoard);
    setDifficulty(loadedBoard.difficulty);
    setReferenceImageUrl(loadedBoard.referenceImageUrl);
    setMode("edit");
    setActiveBuilderTool("shape");
    setSelectedLetter(loadedBoard.activeLetters[0] ?? PLAY_LETTERS[0]);
    setStatus(`Bord geladen: ${saved.name}.`);
  }

  function handleNewBoard() {
    setBoard(null);
    setMode("setup");
    setActiveBuilderTool("shape");
    setActivePlayTool("letter");
    setSelectedLetter(PLAY_LETTERS[0]);
    setStatus("Maak een nieuw basisgrid of laad een opgeslagen bord.");
  }

  function handlePlayBoard() {
    if (!board) {
      return;
    }

    const normalizedBoard = normalizeBoard(board);
    setBoard(normalizedBoard);
    setSelectedLetter(normalizedBoard.activeLetters[0] ?? PLAY_LETTERS[0]);
    setMode("play");
    setActivePlayTool("letter");
    setStatus("Speelmodus geopend. Kies een personage, kies Aantekening of Plaatsen en tik daarna op een cel.");
  }

  function handleEditCurrentBoard() {
    if (!board) {
      return;
    }

    setMode("edit");
    setStatus("Bewerkmodus geopend. Pas vorm, randen, kleuren, objecten of stopcellen aan.");
  }

  function handleMainMenu() {
    setMode("setup");
    setStatus("Hoofdmenu geopend. Speel het huidige bord verder, bewerk het bord, maak een nieuw bord of laad een opgeslagen bord.");
  }

  const activeCells = board?.cells.filter((cell) => cell.isActive).length ?? 0;
  const personCount = board?.activeLetters.length ?? 0;
  const suspectCount = personCount > 0 ? Math.max(0, personCount - 1) : 0;

  return (
    <main className={mode === "play" ? "appShell playShell" : "appShell"}>
      {mode !== "play" && (
        <header className="hero">
          <p className="eyebrow">Murdoku Board Maker PWA</p>
          <h1>Handmatig exact bord maken</h1>
          <p>
            Kies een moeilijkheid. De app kiest een passend vierkant bord. Daarna kun je kamers, kleuren, objecten en stopcellen aanpassen.
          </p>
        </header>
      )}

      {mode !== "play" && <div className="statusBar">{status}</div>}

      {mode === "setup" && board && (
        <section className="card currentBoardCard">
          <div className="sectionTitle compact">
            <span>1</span>
            <div>
              <h2>Huidig bord</h2>
              <p>{board.rows}x{board.cols}, {activeCells} actieve cellen, {board.rooms.length} kamers, {suspectCount} verdachten en 1 slachtoffer.</p>
            </div>
          </div>

          <div className="buttonRow currentBoardActions">
            <button className="primaryButton" type="button" onClick={handlePlayBoard}>Speel huidig bord</button>
            <button className="ghostButton" type="button" onClick={handleEditCurrentBoard}>Bewerk huidig bord</button>
          </div>
        </section>
      )}

      {mode === "setup" && (
        <SetupPanel
          difficulty={difficulty}
          referenceImageUrl={referenceImageUrl}
          onDifficultyChange={(value) => {
            setDifficulty(value);
            setStatus(`${difficultyLabel(value)} gekozen. Mogelijk formaat: ${getBoardSizeRangeLabel(value)}.`);
          }}
          onReferenceImageChange={setReferenceImageUrl}
          onCreateBoard={handleCreateBoard}
          onLoadSaved={handleLoadSaved}
        />
      )}

      {board && mode === "edit" && (
        <>
          <ToolBar
            activeTool={activeBuilderTool}
            roomCount={board.rooms.length}
            activeCells={activeCells}
            onToolChange={(tool) => {
              setActiveBuilderTool(tool);
              setStatus(tool === "wall" ? "Klik of sleep over een rand. Start horizontaal voor horizontale lijnen en verticaal voor verticale lijnen." : "Tool gewijzigd.");
            }}
            onSave={handleSave}
            onPlay={handlePlayBoard}
            onNewBoard={handleNewBoard}
          />

          <BoardEditorView board={board} activeTool={activeBuilderTool} onBoardChange={setBoard} />
        </>
      )}

      {board && mode === "play" && (
        <PlayBoardView
          board={board}
          activeTool={activePlayTool}
          selectedLetter={selectedLetter}
          onToolChange={setActivePlayTool}
          onLetterChange={setSelectedLetter}
          onBoardChange={setBoard}
          onMainMenu={handleMainMenu}
        />
      )}
    </main>
  );
}
