import { useRef } from "react";
import type { PuzzleDifficulty } from "../types/board";

type SetupPanelProps = {
  rows: number;
  cols: number;
  difficulty: PuzzleDifficulty;
  referenceImageUrl: string | null;
  onRowsChange: (value: number) => void;
  onColsChange: (value: number) => void;
  onDifficultyChange: (value: PuzzleDifficulty) => void;
  onReferenceImageChange: (value: string | null) => void;
  onCreateBoard: () => void;
  onLoadSaved: () => void;
};

function numberOptions(min: number, max: number) {
  const options = [];

  for (let value = min; value <= max; value += 1) {
    options.push(value);
  }

  return options;
}

export function SetupPanel({
  rows,
  cols,
  difficulty,
  referenceImageUrl,
  onRowsChange,
  onColsChange,
  onDifficultyChange,
  onReferenceImageChange,
  onCreateBoard,
  onLoadSaved
}: SetupPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onReferenceImageChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <section className="card setupCard">
      <div className="sectionTitle">
        <span>1</span>
        <div>
          <h2>Maak leeg basisgrid</h2>
          <p>Kies eerst hoeveel rijen en kolommen het maximale bordgebied heeft. Daarna verwijder je de cellen die buiten de echte bordvorm vallen.</p>
        </div>
      </div>

      <div className="formGrid setupGrid">
        <label>
          Rijen
          <select value={rows} onChange={(event) => onRowsChange(Number(event.target.value))}>
            {numberOptions(4, 18).map((value) => (
              <option value={value} key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Kolommen
          <select value={cols} onChange={(event) => onColsChange(Number(event.target.value))}>
            {numberOptions(4, 18).map((value) => (
              <option value={value} key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Moeilijkheid
          <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value as PuzzleDifficulty)}>
            <option value="easy">Makkelijk</option>
            <option value="normal">Normaal</option>
            <option value="hard">Moeilijk</option>
          </select>
        </label>
      </div>

      <div className="instructionBox compactInfoBox">
        <strong>Personages</strong>
        <p>De kaart bepaalt het maximum. De moeilijkheid bepaalt hoeveel verdachten meedoen, altijd samen met 1 slachtoffer.</p>
      </div>

      <div className="buttonRow">
        <button className="primaryButton" type="button" onClick={onCreateBoard}>Maak bord</button>
        <button className="ghostButton" type="button" onClick={() => fileRef.current?.click()}>Kies referentiefoto</button>
        <button className="ghostButton" type="button" onClick={onLoadSaved}>Laad opgeslagen</button>
      </div>

      <input
        ref={fileRef}
        className="hiddenInput"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />

      {referenceImageUrl && (
        <div className="referencePreview">
          <div className="previewHeader">
            <strong>Referentiefoto</strong>
            <button type="button" onClick={() => onReferenceImageChange(null)}>Verwijder</button>
          </div>
          <img src={referenceImageUrl} alt="Referentiefoto" />
        </div>
      )}
    </section>
  );
}
