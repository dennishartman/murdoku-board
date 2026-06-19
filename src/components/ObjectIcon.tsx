import type { BoardObjectTypeId } from "../types/board";

type ObjectIconProps = {
  type: BoardObjectTypeId | null | undefined;
  className?: string;
};

function iconPaths(type: BoardObjectTypeId | null | undefined) {
  if (type === "chair") {
    return (
      <>
        <path className="objectIconSoftFill" d="M8 5.5h8v6H8z" />
        <path d="M8 11.5V6.8A2.8 2.8 0 0 1 10.8 4h2.4A2.8 2.8 0 0 1 16 6.8v4.7" />
        <path d="M6.5 11.5h11" />
        <path d="M7.2 11.5v4.6h9.6v-4.6" />
        <path d="M8.3 16.1 7.4 20" />
        <path d="M15.7 16.1l.9 3.9" />
        <path className="objectIconDetail" d="M10 7.2h4" />
      </>
    );
  }

  if (type === "bed") {
    return (
      <>
        <path className="objectIconSoftFill" d="M5 11h14v5H5z" />
        <path d="M4.5 8.8V19" />
        <path d="M19.5 12V19" />
        <path d="M4.5 13h15" />
        <path d="M7 9h4.4a2 2 0 0 1 2 2v2" />
        <path d="M7 10.5h4" />
        <path d="M5.5 16.5h14" />
        <path d="M6.5 19h13" />
      </>
    );
  }

  if (type === "bookcase") {
    return (
      <>
        <path className="objectIconSoftFill" d="M5.5 4.5h13v15h-13z" />
        <path d="M5.5 4.5h13v15h-13z" />
        <path d="M5.5 9.3h13" />
        <path d="M5.5 14.2h13" />
        <path className="objectIconDetail" d="M8 5.4v3.9" />
        <path className="objectIconDetail" d="M10.8 5.4v3.9" />
        <path className="objectIconDetail" d="M14.5 9.3v4.9" />
        <path className="objectIconDetail" d="M8.8 14.2v5.3" />
        <path className="objectIconDetail" d="M16 14.2v5.3" />
      </>
    );
  }

  if (type === "painting") {
    return (
      <>
        <path className="objectIconSoftFill" d="M4.5 6h15v12h-15z" />
        <path d="M4.5 6h15v12h-15z" />
        <path d="M6.8 15.2 10.2 12l2.4 2.5 1.7-1.8 3 2.5" />
        <path d="M15.9 9.2h.1" />
        <path className="objectIconDetail" d="M9.5 4.4h5" />
        <path className="objectIconDetail" d="M12 4.4V6" />
      </>
    );
  }

  if (type === "safe") {
    return (
      <>
        <path className="objectIconSoftFill" d="M5 6h14v12H5z" />
        <path d="M5 6h14v12H5z" />
        <path d="M8 9h4" />
        <path d="M15.8 12a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0Z" />
        <path className="objectIconDetail" d="M13 9.4v5.2" />
        <path className="objectIconDetail" d="M10.4 12h5.2" />
        <path className="objectIconDetail" d="M7.6 16h1.8" />
      </>
    );
  }

  if (type === "clock") {
    return (
      <>
        <path className="objectIconSoftFill" d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        <path d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        <path d="M12 8v4l3 2" />
        <path d="M8 3.8 6.5 5.2" />
        <path d="M16 3.8l1.5 1.4" />
        <path className="objectIconDetail" d="M12 5.8v.1" />
        <path className="objectIconDetail" d="M18.2 12h-.1" />
        <path className="objectIconDetail" d="M12 18.2v-.1" />
        <path className="objectIconDetail" d="M5.8 12h.1" />
      </>
    );
  }

  if (type === "statue") {
    return (
      <>
        <path className="objectIconSoftFill" d="M8.5 20h7l-1-4.5h-5z" />
        <path d="M12 4.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        <path d="M8.3 15.5a3.7 3.7 0 0 1 7.4 0" />
        <path d="M8 15.5h8" />
        <path d="M9.5 15.5 8.5 20h7l-1-4.5" />
        <path d="M7.5 20h9" />
        <path className="objectIconDetail" d="M10.5 10.8v1.8" />
        <path className="objectIconDetail" d="M13.5 10.8v1.8" />
      </>
    );
  }

  if (type === "candle") {
    return (
      <>
        <path className="objectIconSoftFill" d="M9.5 11h5v7.5h-5z" />
        <path d="M12 4.2c1.4 1.2 2.1 2.4 2.1 3.6a2.1 2.1 0 1 1-4.2 0c0-1 .7-2.1 2.1-3.6Z" />
        <path d="M9.5 11h5v7.5h-5z" />
        <path d="M8 18.5h8" />
        <path d="M10 13.5h4" />
        <path className="objectIconDetail" d="M13.8 11.4v2.2" />
        <path className="objectIconDetail" d="M10.8 18.5v1.5" />
        <path className="objectIconDetail" d="M13.2 18.5v1.5" />
      </>
    );
  }

  return <path d="M6 6h12v12H6z" />;
}

export function ObjectIcon({ type, className = "objectIcon" }: ObjectIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {iconPaths(type)}
    </svg>
  );
}
