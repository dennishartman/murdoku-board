import type { BoardObjectTypeId, BoardObstacleTypeId } from "../types/board";

import bedImageUrl from "../assets/object-images/bed.webp";
import bookcaseImageUrl from "../assets/object-images/bookcase.webp";
import cabinetImageUrl from "../assets/object-images/cabinet.webp";
import candleImageUrl from "../assets/object-images/candle.webp";
import chairImageUrl from "../assets/object-images/chair.webp";
import clockImageUrl from "../assets/object-images/clock.webp";
import crateImageUrl from "../assets/object-images/crate.webp";
import fireplaceImageUrl from "../assets/object-images/fireplace.webp";
import hedgeImageUrl from "../assets/object-images/hedge.webp";
import lockedDoorImageUrl from "../assets/object-images/locked_door.webp";
import paintingImageUrl from "../assets/object-images/painting.webp";
import pianoImageUrl from "../assets/object-images/piano.webp";
import plantImageUrl from "../assets/object-images/plant.webp";
import safeImageUrl from "../assets/object-images/safe.webp";
import statueImageUrl from "../assets/object-images/statue.webp";
import tableImageUrl from "../assets/object-images/table.webp";

type BoardDecorationTypeId = BoardObjectTypeId | BoardObstacleTypeId;
type IconKind = "object" | "obstacle";

type ObjectIconProps = {
  type: BoardDecorationTypeId | null | undefined;
  className?: string;
  kind?: IconKind;
};

const imageSources: Record<BoardDecorationTypeId, string> = {
  chair: chairImageUrl,
  bed: bedImageUrl,
  bookcase: bookcaseImageUrl,
  painting: paintingImageUrl,
  safe: safeImageUrl,
  clock: clockImageUrl,
  statue: statueImageUrl,
  candle: candleImageUrl,
  table: tableImageUrl,
  plant: plantImageUrl,
  hedge: hedgeImageUrl,
  cabinet: cabinetImageUrl,
  piano: pianoImageUrl,
  crate: crateImageUrl,
  fireplace: fireplaceImageUrl,
  locked_door: lockedDoorImageUrl,
};

function fallbackIcon() {
  return (
    <svg className="decorIcon decorIcon--unknown" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="#cbd5e1" stroke="#1f2937" strokeWidth="0.9" />
      <path d="M8.5 8.5h7v7h-7Z" fill="#94a3b8" />
    </svg>
  );
}

export function ObjectIcon({ type, className = "objectIcon", kind = "object" }: ObjectIconProps) {
  const safeType = type ?? "unknown";
  const iconClassName = [className, "decorIcon", `decorIcon--${kind}`, `decorIcon--${safeType}`].filter(Boolean).join(" ");
  const imageSource = type ? imageSources[type] : undefined;

  if (!imageSource) {
    return fallbackIcon();
  }

  return <img className={iconClassName} src={imageSource} alt="" aria-hidden="true" draggable={false} />;
}
