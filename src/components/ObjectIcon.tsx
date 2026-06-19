import type { BoardObjectTypeId, BoardObstacleTypeId } from "../types/board";

type BoardDecorationTypeId = BoardObjectTypeId | BoardObstacleTypeId;
type IconKind = "object" | "obstacle";

type ObjectIconProps = {
  type: BoardDecorationTypeId | null | undefined;
  className?: string;
  kind?: IconKind;
};

function iconPaths(type: BoardDecorationTypeId | null | undefined) {
  if (type === "chair") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.4" ry="1.4" fill="#111827" opacity="0.18" />
        <path d="M7 10.2C7 6.8 9.2 4.5 12 4.5s5 2.3 5 5.7v2.2H7Z" fill="#9a5a2e" stroke="#2f1d12" strokeWidth="0.9" />
        <path d="M8.2 10.1C8.2 7.5 9.8 5.8 12 5.8s3.8 1.7 3.8 4.3v1H8.2Z" fill="#d08a45" />
        <rect x="5.6" y="11" width="12.8" height="4.8" rx="1.2" fill="#e6a85d" stroke="#2f1d12" strokeWidth="0.9" />
        <path d="M7.4 15.5 6.6 20M16.6 15.5l.8 4.5M9.7 15.5l.4 4M14.3 15.5l-.4 4" stroke="#4a2d1a" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M9.2 8.2c1-.8 2.5-1 3.6-.8" stroke="#f7d08a" strokeWidth="0.8" strokeLinecap="round" opacity="0.9" />
      </>
    );
  }

  if (type === "bed") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="7.2" ry="1.5" fill="#111827" opacity="0.16" />
        <path d="M4.8 8.2h3.9c1.5 0 2.7 1.1 2.7 2.6v1.4H4.8Z" fill="#f8fafc" stroke="#1f2937" strokeWidth="0.9" />
        <path d="M4.4 11.1h15.2v5.4H4.4Z" fill="#60a5fa" stroke="#1f2937" strokeWidth="0.9" />
        <path d="M11.2 11.1h8.4v5.4h-8.4Z" fill="#2563eb" opacity="0.75" />
        <path d="M4.2 7.3v12.4M19.8 11v8.7M4.2 16.5h15.6" stroke="#3b2416" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M6.4 12.8h5.1" stroke="#bfdbfe" strokeWidth="0.8" strokeLinecap="round" />
      </>
    );
  }

  if (type === "bookcase") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.8" ry="1.5" fill="#111827" opacity="0.18" />
        <rect x="5" y="3.6" width="14" height="16.4" rx="1" fill="#7c3f1d" stroke="#1f140c" strokeWidth="0.9" />
        <path d="M6.2 8.7h11.6M6.2 14h11.6" stroke="#2f1d12" strokeWidth="0.9" />
        <rect x="6.8" y="4.8" width="2" height="3.7" rx="0.3" fill="#ef4444" />
        <rect x="9.3" y="4.8" width="1.6" height="3.7" rx="0.3" fill="#22c55e" />
        <rect x="11.5" y="4.8" width="2.1" height="3.7" rx="0.3" fill="#facc15" />
        <rect x="14.3" y="4.8" width="2.4" height="3.7" rx="0.3" fill="#38bdf8" />
        <rect x="7" y="9.7" width="3.1" height="3.9" rx="0.4" fill="#c084fc" />
        <rect x="10.8" y="9.6" width="1.8" height="4" rx="0.3" fill="#f97316" />
        <rect x="13.3" y="9.6" width="3.6" height="4" rx="0.4" fill="#e5e7eb" />
        <rect x="6.9" y="15" width="4.2" height="4.2" rx="0.5" fill="#0ea5e9" />
        <rect x="12" y="15" width="2" height="4.2" rx="0.3" fill="#84cc16" />
        <rect x="14.8" y="15" width="2.4" height="4.2" rx="0.3" fill="#f59e0b" />
      </>
    );
  }

  if (type === "painting") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.3" ry="1.2" fill="#111827" opacity="0.13" />
        <path d="M12 3.4v2.2" stroke="#334155" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M9.4 5.6h5.2" stroke="#334155" strokeWidth="0.9" strokeLinecap="round" />
        <rect x="4.2" y="6" width="15.6" height="11.8" rx="0.9" fill="#92400e" stroke="#1f140c" strokeWidth="0.9" />
        <rect x="5.7" y="7.5" width="12.6" height="8.8" rx="0.5" fill="#bfdbfe" />
        <path d="M5.9 14.8 9.2 11.6l2.2 2.3 1.9-1.9 4.8 3.9H5.9Z" fill="#22c55e" />
        <circle cx="15.6" cy="9.6" r="1.2" fill="#facc15" />
        <path d="M6.5 8.1h11" stroke="#fef3c7" strokeWidth="0.7" strokeLinecap="round" opacity="0.65" />
      </>
    );
  }

  if (type === "safe") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.6" ry="1.3" fill="#111827" opacity="0.2" />
        <rect x="4.6" y="5.3" width="14.8" height="13.1" rx="1.6" fill="#64748b" stroke="#111827" strokeWidth="1" />
        <rect x="6" y="6.7" width="12" height="10.2" rx="0.9" fill="#94a3b8" />
        <circle cx="12.8" cy="11.7" r="3.1" fill="#334155" stroke="#0f172a" strokeWidth="0.8" />
        <circle cx="12.8" cy="11.7" r="1.1" fill="#e5e7eb" />
        <path d="M12.8 8.8v5.8M9.9 11.7h5.8" stroke="#cbd5e1" strokeWidth="0.7" strokeLinecap="round" />
        <rect x="7.3" y="8.3" width="2.7" height="1" rx="0.3" fill="#1f2937" />
        <rect x="7.3" y="15" width="2" height="0.9" rx="0.3" fill="#1f2937" />
      </>
    );
  }

  if (type === "clock") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="5.8" ry="1.2" fill="#111827" opacity="0.14" />
        <path d="M7.1 5 5.8 3.8M16.9 5l1.3-1.2" stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="7.1" fill="#fef3c7" stroke="#7c2d12" strokeWidth="1.1" />
        <circle cx="12" cy="12" r="5.6" fill="#fff7ed" stroke="#f59e0b" strokeWidth="0.6" />
        <path d="M12 8.2v4l3 2" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6.6v.1M17.4 12h-.1M12 17.4v-.1M6.6 12h.1" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="10.4" y="19" width="3.2" height="1.1" rx="0.4" fill="#7c2d12" />
      </>
    );
  }

  if (type === "statue") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="6.4" ry="1.3" fill="#111827" opacity="0.17" />
        <path d="M9.4 19.3h5.2l-.8-4.1h-3.6Z" fill="#a8a29e" stroke="#44403c" strokeWidth="0.8" />
        <path d="M8.3 15.2c.3-3.1 2-5.1 3.7-5.1s3.4 2 3.7 5.1Z" fill="#d6d3d1" stroke="#44403c" strokeWidth="0.8" />
        <circle cx="12" cy="6.9" r="3.1" fill="#e7e5e4" stroke="#44403c" strokeWidth="0.8" />
        <path d="M10.5 7.2h.1M13.4 7.2h.1M11 8.9c.7.4 1.4.4 2 0" stroke="#57534e" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M8.1 15.2h7.8M7.3 19.3h9.4" stroke="#44403c" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M10.3 11.1c.7.5 2.6.5 3.4 0" stroke="#fafaf9" strokeWidth="0.7" strokeLinecap="round" opacity="0.75" />
      </>
    );
  }

  if (type === "candle") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="5.8" ry="1.3" fill="#111827" opacity="0.15" />
        <path d="M12 3.4c1.6 1.3 2.4 2.6 2.4 3.9a2.4 2.4 0 1 1-4.8 0c0-1.1.8-2.4 2.4-3.9Z" fill="#f97316" stroke="#7c2d12" strokeWidth="0.7" />
        <path d="M12 5.1c.7.8 1.1 1.5 1.1 2.1a1.1 1.1 0 1 1-2.2 0c0-.5.4-1.2 1.1-2.1Z" fill="#fde68a" />
        <rect x="9.1" y="10.5" width="5.8" height="8" rx="0.8" fill="#f8fafc" stroke="#1f2937" strokeWidth="0.8" />
        <path d="M10 13h4M8 18.5h8" stroke="#1f2937" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M13.7 11.3v3.2" stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M10.5 18.5v1.4M13.5 18.5v1.4" stroke="#7c2d12" strokeWidth="0.9" strokeLinecap="round" />
      </>
    );
  }

  if (type === "table") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="7.2" ry="1.4" fill="#111827" opacity="0.18" />
        <path d="M5.2 8.2h13.6c.8 0 1.4.6 1.4 1.4v1c0 .8-.6 1.4-1.4 1.4H5.2c-.8 0-1.4-.6-1.4-1.4v-1c0-.8.6-1.4 1.4-1.4Z" fill="#a16207" stroke="#2f1d12" strokeWidth="0.9" />
        <path d="M5.4 10.1h13.2" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        <path d="M6.6 12 5.8 19M17.4 12l.8 7M9 12v6.4M15 12v6.4" stroke="#4a2d1a" strokeWidth="1.2" strokeLinecap="round" />
      </>
    );
  }

  if (type === "plant") {
    return (
      <>
        <ellipse cx="12" cy="21" rx="5.8" ry="1.3" fill="#111827" opacity="0.16" />
        <path d="M9.2 14.7h5.6l-.8 5H10Z" fill="#b45309" stroke="#431407" strokeWidth="0.8" />
        <path d="M12 14.8V7" stroke="#166534" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M11.7 8.2C8.8 5 6.1 5.2 5.3 7.1c2.1 1.5 4.2 1.9 6.4 1.1Z" fill="#22c55e" stroke="#166534" strokeWidth="0.7" />
        <path d="M12.3 8.7c2.8-3.3 5.4-3 6.2-1.2-2 1.8-4.2 2.3-6.2 1.2Z" fill="#16a34a" stroke="#166534" strokeWidth="0.7" />
        <path d="M12 12c-2.6-1.8-4.8-1-5.6.7 2.2 1.2 4 .9 5.6-.7Z" fill="#84cc16" stroke="#166534" strokeWidth="0.7" />
        <path d="M12 12.2c2.7-2 4.8-1.3 5.8.3-2 1.5-4 1.4-5.8-.3Z" fill="#65a30d" stroke="#166534" strokeWidth="0.7" />
      </>
    );
  }

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
  const svgClassName = [className, "decorIcon", `decorIcon--${kind}`, `decorIcon--${safeType}`].filter(Boolean).join(" ");

  return (
    <svg className={svgClassName} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {iconPaths(type)}
    </svg>
  );
}
