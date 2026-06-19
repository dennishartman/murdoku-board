import type { BuilderToolMode } from "../types/board";

type ToolBarProps = {
  activeTool: BuilderToolMode;
  roomCount: number;
  activeCells: number;
  solutionReady: boolean;
  hintCount: number;
  showSolution: boolean;
  onToolChange: (tool: BuilderToolMode) => void;
  onSave: () => void;
  onPlay: () => void;
  onNewBoard: () => void;
  onGenerateSolution: () => void;
  onGenerateHints: () => void;
  onToggleSolution: () => void;
};

const tools: Array<{ id: BuilderToolMode; label: string; help: string }> = [
  { id: "shape", label: "Vorm", help: "Cellen aan of uit zetten" },
  { id: "wall", label: "Rand", help: "Kamerlijnen tekenen" },
  { id: "color", label: "Kamer", help: "Kamernaam kiezen" },
  { id: "object", label: "Object", help: "Object voor hints" },
  { id: "blocked", label: "Stop", help: "Obstakel of stopcel" }
];

export function ToolBar({
  activeTool,
  roomCount,
  activeCells,
  solutionReady,
  hintCount,
  showSolution,
  onToolChange,
  onSave,
  onPlay,
  onNewBoard,
  onGenerateSolution,
  onGenerateHints,
  onToggleSolution
}: ToolBarProps) {
  return (
    <section className="card toolCard">
      <div className="toolStats">
        <span>Kamers: <strong>{roomCount}</strong></span>
        <span>Cellen: <strong>{activeCells}</strong></span>
        <span>Oplossing: <strong>{solutionReady ? "ja" : "nee"}</strong></span>
        <span>Hints: <strong>{hintCount}</strong></span>
      </div>

      <div className="toolGrid builderToolGrid">
        {tools.map((tool) => (
          <button className={activeTool === tool.id ? "toolButton active" : "toolButton"} type="button" key={tool.id} onClick={() => onToolChange(tool.id)} title={tool.help}>
            <strong>{tool.label}</strong>
            <span>{tool.help}</span>
          </button>
        ))}
      </div>

      <div className="buttonRow solutionActionRow">
        <button className="primaryButton" type="button" onClick={onGenerateSolution}>Genereer oplossing</button>
        <button className="primaryButton" type="button" onClick={onGenerateHints} disabled={!solutionReady}>Genereer hints</button>
        <button className="ghostButton" type="button" onClick={onToggleSolution} disabled={!solutionReady}>{showSolution ? "Verberg oplossing" : "Toon oplossing"}</button>
      </div>

      <div className="buttonRow boardActionRow">
        <button className="primaryButton" type="button" onClick={onPlay}>Speel bord</button>
        <button className="ghostButton" type="button" onClick={onSave}>Bewaar</button>
        <button className="ghostButton" type="button" onClick={onNewBoard}>Nieuw bord</button>
      </div>
    </section>
  );
}
