import type { BoardObjectTypeId, BoardObstacleTypeId } from "../types/board";

import bedImageUrl from "../assets/object-images/bed.webp";
import bookcaseImageUrl from "../assets/object-images/bookcase.webp";
import candleImageUrl from "../assets/object-images/candle.webp";
import chairImageUrl from "../assets/object-images/chair.webp";
import clockImageUrl from "../assets/object-images/clock.webp";
import paintingImageUrl from "../assets/object-images/painting.webp";
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

const imageSources: Partial<Record<BoardDecorationTypeId, string>> = {
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
};

function fallbackIconPaths(type: BoardDecorationTypeId | null | undefined) {
  if (type === "hedge") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="7.1" ry="1.2" fill="#111827" opacity="0.15" />
        <path d="M5.2 12.2a3 3 0 0 1 4.4-3.8 3.2 3.2 0 0 1 5.4 0 3 3 0 0 1 4.4 3.8 3 3 0 0 1-2.1 5H7.3a3 3 0 0 1-2.1-5Z" fill="#16a34a" stroke="#14532d" strokeWidth="0.8" />
        <path d="M7.2 14.9h9.6M8.4 11.2c1.2.9 2.5.9 3.7 0M12.2 12.5c1.2.9 2.8.9 4.2-.2" stroke="#bbf7d0" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
        <path d="M6.5 17.1h11" stroke="#14532d" strokeWidth="0.9" strokeLinecap="round" />
      </>
    );
  }

  if (type === "cabinet") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.4" ry="1.3" fill="#111827" opacity="0.18" />
        <rect x="5.4" y="4.3" width="13.2" height="15.2" rx="1" fill="#92400e" stroke="#2f1d12" strokeWidth="0.9" />
        <path d="M12 4.6v14.6M6.5 8.6h11M6.5 13.6h11" stroke="#4a2d1a" strokeWidth="0.8" />
        <circle cx="10.2" cy="11" r="0.6" fill="#facc15" />
        <circle cx="13.8" cy="11" r="0.6" fill="#facc15" />
        <circle cx="10.2" cy="16" r="0.6" fill="#facc15" />
        <circle cx="13.8" cy="16" r="0.6" fill="#facc15" />
        <path d="M7.1 5.5h4M12.9 5.5h4" stroke="#fbbf24" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
      </>
    );
  }

  if (type === "piano") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="7" ry="1.3" fill="#111827" opacity="0.18" />
        <path d="M5.2 6.5h13.6c.9 0 1.6.7 1.6 1.6v5.2H3.6V8.1c0-.9.7-1.6 1.6-1.6Z" fill="#111827" stroke="#020617" strokeWidth="0.9" />
        <path d="M4.5 13.3h15v3.2h-15Z" fill="#f8fafc" stroke="#111827" strokeWidth="0.8" />
        <path d="M6.3 13.4v2M8.2 13.4v2M10.1 13.4v2M12 13.4v2M13.9 13.4v2M15.8 13.4v2M17.7 13.4v2" stroke="#111827" strokeWidth="0.45" />
        <path d="M7.2 13.4v1.2M11.1 13.4v1.2M14.9 13.4v1.2" stroke="#111827" strokeWidth="1" strokeLinecap="round" />
        <path d="M6.4 16.5 5.8 19.5M17.6 16.5l.6 3" stroke="#111827" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M6.2 8.2h10" stroke="#475569" strokeWidth="0.8" strokeLinecap="round" />
      </>
    );
  }

  if (type === "crate") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.6" ry="1.3" fill="#111827" opacity="0.18" />
        <rect x="5.4" y="7" width="13.2" height="11.5" rx="0.7" fill="#b45309" stroke="#431407" strokeWidth="0.9" />
        <path d="M5.8 10.2h12.4M5.8 15.2h12.4M8.2 7.3v10.8M15.8 7.3v10.8M6.4 17.8 17.6 7.7M6.4 7.7l11.2 10.1" stroke="#78350f" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M6.6 8.2h5.5" stroke="#fbbf24" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
      </>
    );
  }

  if (type === "fireplace") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="7" ry="1.3" fill="#111827" opacity="0.18" />
        <path d="M4.8 7h14.4v12H15v-5.6H9V19H4.8Z" fill="#7f1d1d" stroke="#2f1111" strokeWidth="0.9" />
        <path d="M6.1 8.3h11.8M6.1 11h3.2M10.8 11h2.4M14.7 11h3.2M6.1 13.7h2.2M15.7 13.7h2.2" stroke="#fca5a5" strokeWidth="0.65" strokeLinecap="round" opacity="0.7" />
        <path d="M12 12.9c1.6 1.3 2.4 2.6 2.4 3.8a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.5 2.4-3.8Z" fill="#ef4444" />
        <path d="M12 14.5c.8.8 1.2 1.6 1.2 2.2a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.4 1.2-2.2Z" fill="#fde047" />
        <path d="M9.3 18.8h5.4" stroke="#431407" strokeWidth="0.9" strokeLinecap="round" />
      </>
    );
  }

  if (type === "locked_door") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.2" ry="1.2" fill="#111827" opacity="0.17" />
        <path d="M7.1 4.2h9.8v15.5H7.1Z" fill="#92400e" stroke="#2f1d12" strokeWidth="0.9" />
        <path d="M8.5 5.6h7v12.7h-7Z" fill="#b45309" />
        <circle cx="14.5" cy="11.8" r="0.8" fill="#facc15" stroke="#713f12" strokeWidth="0.4" />
        <rect x="9" y="11.2" width="4.1" height="4.2" rx="0.5" fill="#334155" stroke="#111827" strokeWidth="0.7" />
        <path d="M9.8 11.2V9.7a1.3 1.3 0 0 1 2.6 0v1.5" fill="none" stroke="#111827" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M8.6 5.7h6.8" stroke="#fbbf24" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
      </>
    );
  }

  return (
    <>
      <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="#cbd5e1" stroke="#1f2937" strokeWidth="0.9" />
      <path d="M8.5 8.5h7v7h-7Z" fill="#94a3b8" />
    </>
  );
}

export function ObjectIcon({ type, className = "objectIcon", kind = "object" }: ObjectIconProps) {
  const safeType = type ?? "unknown";
  const iconClassName = [className, "decorIcon", `decorIcon--${kind}`, `decorIcon--${safeType}`].filter(Boolean).join(" ");
  const imageSource = type ? imageSources[type] : undefined;

  if (imageSource) {
    return <img className={iconClassName} src={imageSource} alt="" aria-hidden="true" draggable={false} />;
  }

  return (
    <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {fallbackIconPaths(type)}
    </svg>
  );
}
