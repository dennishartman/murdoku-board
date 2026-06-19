import { useRef } from "react";
import { getBoardSizeRangeLabel } from "../lib/boardModel";
import type { PuzzleDifficulty } from "../types/board";

type SetupPanelProps = {
  difficulty: PuzzleDifficulty;
  referenceImageUrl: string | null;
  onDifficultyChange: (value: PuzzleDifficulty) => void;
  onReferenceImageChange: (value: string | null) => void;
  onCreateBoard: () => void;
  onLoadSaved: () => void;
};

export function SetupPanel({
  difficulty,
  referenceImageUrl,
  onDifficultyChange,
  onReferenceImageChange,
  onCreateBoard,
  onLoadSaved
}: SetupPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sizeRange = getBoardSizeRangeLabel(difficulty);

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
          <h2>Maak een nieuw bord</h2>
          <p>Kies de moeilijkheid. De app kiest daarna automatisch een passende vierkante bordgrootte en hetzelfde aantal personages.</p>
        </div>
      </div>

      <div className="formGrid setupGrid singleSetupGrid">
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
        <strong>Formaat en personages</strong>
        <p>Voor deze moeilijkheid wordt een bord gekozen van {sizeRange}. Elke rij en elke kolom krijgt uiteindelijk precies 1 personage.</p>
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
