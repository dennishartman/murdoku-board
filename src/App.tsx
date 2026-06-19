import { useMemo, useState } from "react";
import { BoardEditorView } from "./components/BoardView";
import { PlayBoardView } from "./components/PlayBoardView";
import { SetupPanel } from "./components/SetupPanel";
import { ToolBar } from "./components/ToolBar";
import { createBoardForDifficulty, DEFAULT_DIFFICULTY, getBoardSizeRangeLabel, normalizeBoard, PLAY_LETTERS } from "./lib/boardModel";
import { describeHints } from "./lib/hintEngine";
import { generateBetaHints } from "./lib/hintGenerator";
import { describeSolution, generateSolution } from "./lib/solutionGenerator";
import { loadBoard, saveBoard } from "./lib/storage";
import type { BoardGrid, BuilderToolMode, Hint, HintSubject, PlayLetter, PlayToolMode, PuzzleDifficulty } from "./types/board";

type ScreenMode = "setup" | "edit" | "play";

type HintTextGroup = {
  key: string;
  title: string;
  items: Array<{
    hint: Hint;
    text: string;
    index: number;
  }>;
};

function difficultyLabel(difficulty: PuzzleDifficulty) {
  if (difficulty === "easy") {
    return "Makkelijk";
  }

  if (difficulty === "hard") {
    return "Moeilijk";
  }

  return "Normaal";
}

function subjectGroupKey(subject: HintSubject) {
  if (subject.kind === "character") {
    return `character:${subject.letter}`;
  }

  return `gender:${subject.gender}`;
}

function hintGroupKey(hint: Hint) {
  if (hint.type === "murderer_room") {
    return `character:${hint.victimLetter}`;
  }

  if (hint.type === "room_person_count") {
    return "general";
  }

  if (hint.type === "room_group_count") {
    return hint.subject ? subjectGroupKey(hint.subject) : "general";
  }

  return subjectGroupKey(hint.subject);
}

function hintGroupTitle(board: BoardGrid, key: string) {
  if (key.startsWith("character:")) {
    const letter = key.replace("character:", "") as PlayLetter;
    const character = board.activeCharacters[letter];

    return character ? `${character.name} (${letter})` : `Personage ${letter}`;
  }

  if (key === "gender:male") {
    return "Mannen";
  }

  if (key === "gender:female") {
    return "Vrouwen";
  }

  if (key === "gender:neutral") {
    return "Personen";
  }

  return "Algemene hints";
}

function makeHintGroups(board: BoardGrid, hintTexts: string[]) {
  const groups: HintTextGroup[] = [];
  const groupIndexes = new Map<string, number>();

  board.hints.forEach((hint, index) => {
    const key = hintGroupKey(hint);
    const item = {
      hint,
      text: hintTexts[index] ?? "Onbekende hint.",
      index
    };
    const groupIndex = groupIndexes.get(key);

    if (groupIndex === undefined) {
      groupIndexes.set(key, groups.length);
      groups.push({
        key,
        title: hintGroupTitle(board, key),
        items: [item]
      });
      return;
    }

    groups[groupIndex].items.push(item);
  });

  return groups;
}

export function App() {
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(DEFAULT_DIFFICULTY);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardGrid | null>(null);
  const [mode, setMode] = useState<ScreenMode>("setup");
  const [activeBuilderTool, setActiveBuilderTool] = useState<BuilderToolMode>("shape");
  const [activePlayTool, setActivePlayTool] = useState<PlayToolMode>("letter");
  const [selectedLetter, setSelectedLetter] = useState<string>(PLAY_LETTERS[0]);
  const [showSolution, setShowSolution] = useState(false);
  const [selectedHintId, setSelectedHintId] = useState<string | null>(null);
  const [status, setStatus] = useState("Kies een moeilijkheid en maak daarna automatisch een passend bord.");

  function handleCreateBoard() {
    const newBoard = createBoardForDifficulty(difficulty, referenceImageUrl);
    setBoard(newBoard);
    setShowSolution(false);
    setSelectedHintId(null);
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
      const solutionText = saved.board.solution ? " inclusief verborgen oplossing" : " zonder verborgen oplossing";
      const hintText = saved.board.hints.length > 0 ? ` en ${saved.board.hints.length} hints` : "";
      setStatus(`Bord opgeslagen op dit apparaat${imageText}${solutionText}${hintText}.`);
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
    setShowSolution(false);
    setSelectedHintId(loadedBoard.hints[0]?.id ?? null);
    setMode("edit");
    setActiveBuilderTool("shape");
    setSelectedLetter(loadedBoard.activeLetters[0] ?? PLAY_LETTERS[0]);
    setStatus(`Bord geladen: ${saved.name}.`);
  }

  function handleNewBoard() {
    setBoard(null);
    setShowSolution(false);
    setSelectedHintId(null);
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
    setShowSolution(false);
    setSelectedHintId(null);
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

  function handleGenerateSolution() {
    if (!board) {
      return;
    }

    const normalizedBoard = normalizeBoard(board);
    const result = generateSolution(normalizedBoard);

    if (!result.ok) {
      setBoard(normalizedBoard);
      setShowSolution(false);
      setSelectedHintId(null);
      setStatus(result.message);
      return;
    }

    const nextBoard = normalizeBoard({ ...normalizedBoard, solution: result.solution, murdererLetter: result.murdererLetter, hints: [] });
    setBoard(nextBoard);
    setShowSolution(true);
    setSelectedHintId(null);
    setStatus(`${result.message} Elke rij en kolom heeft precies 1 personage.`);
  }

  function handleGenerateHints() {
    if (!board) {
      return;
    }

    const normalizedBoard = normalizeBoard(board);
    const result = generateBetaHints(normalizedBoard);

    if (!result.ok) {
      setBoard(normalizedBoard);
      setSelectedHintId(null);
      setStatus(result.message);
      return;
    }

    const nextBoard = normalizeBoard({ ...normalizedBoard, hints: result.hints });
    setBoard(nextBoard);
    setSelectedHintId(result.hints[0]?.id ?? null);
    setStatus(`${result.message} Selecteer een hint in de bewerkmodus om deze op het bord te markeren.`);
  }

  function handleBoardChange(nextBoard: BoardGrid) {
    const normalizedBoard = normalizeBoard(nextBoard);
    setBoard(normalizedBoard);

    if (!normalizedBoard.solution) {
      setShowSolution(false);
    }

    if (selectedHintId && !normalizedBoard.hints.some((hint) => hint.id === selectedHintId)) {
      setSelectedHintId(null);
    }
  }

  const activeCells = board?.cells.filter((cell) => cell.isActive).length ?? 0;
  const personCount = board?.activeLetters.length ?? 0;
  const suspectCount = personCount > 0 ? Math.max(0, personCount - 1) : 0;
  const solutionRows = board ? describeSolution(board) : [];
  const murdererRow = solutionRows.find((entry) => entry.isMurderer);
  const hintCount = board?.hints.length ?? 0;
  const hintTexts = useMemo(() => (board ? describeHints(board.hints, board, board.activeCharacters) : []), [board]);
  const hintGroups = useMemo(() => (board ? makeHintGroups(board, hintTexts) : []), [board, hintTexts]);
  const selectedHint = board?.hints.find((hint) => hint.id === selectedHintId) ?? null;

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
            solutionReady={Boolean(board.solution)}
            hintCount={hintCount}
            showSolution={showSolution}
            onToolChange={(tool) => {
              setActiveBuilderTool(tool);
              setStatus(tool === "wall" ? "Klik of sleep over een rand. Start horizontaal voor horizontale lijnen en verticaal voor verticale lijnen." : "Tool gewijzigd.");
            }}
            onSave={handleSave}
            onPlay={handlePlayBoard}
            onNewBoard={handleNewBoard}
            onGenerateSolution={handleGenerateSolution}
            onGenerateHints={handleGenerateHints}
            onToggleSolution={() => setShowSolution((value) => !value)}
          />

          {hintCount > 0 && (
            <section className="card hintDebugCard">
              <div className="sectionTitle compact hintDebugTitle">
                <span>3</span>
                <div>
                  <h2>Hints controleren</h2>
                  <p>Klik op een hintzin om de relevante cellen op het bord te markeren. De hints zijn gegroepeerd per personage.</p>
                </div>
                <button className="ghostButton smallButton" type="button" onClick={() => setSelectedHintId(null)} disabled={!selectedHintId}>Wis selectie</button>
              </div>

              <div className="hintDebugText" aria-label="Gegenereerde hints">
                {hintGroups.map((group) => (
                  <article className="hintTextGroup" key={group.key}>
                    <h3>{group.title}</h3>
                    <p>
                      {group.items.map((item) => (
                        <button
                          key={item.hint.id}
                          className={selectedHintId === item.hint.id ? "hintInlineItem activeHintInlineItem" : "hintInlineItem"}
                          type="button"
                          onClick={() => setSelectedHintId((current) => (current === item.hint.id ? null : item.hint.id))}
                        >
                          <strong>{item.index + 1}.</strong>
                          <span>{item.text}</span>
                        </button>
                      ))}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {showSolution && board.solution && (
            <section className="card solutionCard">
              <div className="sectionTitle compact">
                <span>{hintCount > 0 ? "4" : "3"}</span>
                <div>
                  <h2>Verborgen oplossing</h2>
                  <p>
                    Debugweergave voor het testen. {murdererRow ? `${murdererRow.name} is de moordenaar en staat bij het slachtoffer in kamer ${murdererRow.roomId?.replace("room-", "") ?? "?"}.` : "De moordenaar wordt rood gemarkeerd zodra de oplossing bekend is."}
                  </p>
                </div>
              </div>

              <div className="solutionGrid">
                {solutionRows.map((entry) => (
                  <div className={entry.isMurderer ? "solutionItem murdererSolutionItem" : "solutionItem"} key={entry.letter}>
                    <strong>{entry.letter}</strong>
                    <span>{entry.name}</span>
                    <small>{entry.role === "victim" ? "slachtoffer" : entry.isMurderer ? "moordenaar" : "verdachte"}</small>
                    <em>Rij {entry.row}, kolom {entry.col}, kamer {entry.roomId?.replace("room-", "") ?? "?"}</em>
                  </div>
                ))}
              </div>
            </section>
          )}

          <BoardEditorView board={board} activeTool={activeBuilderTool} showSolution={showSolution} selectedHint={selectedHint} onBoardChange={handleBoardChange} />
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
