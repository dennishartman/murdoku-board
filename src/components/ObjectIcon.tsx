import type { BoardObjectTypeId } from "../types/board";

type ObjectIconProps = {
  type: BoardObjectTypeId | null | undefined;
  className?: string;
};

function iconPaths(type: BoardObjectTypeId | null | undefined) {
  if (type === "chair") {
    return (
      <>
        <path d="M7 11h10" />
        <path d="M8 11V6.8A2.8 2.8 0 0 1 10.8 4h2.4A2.8 2.8 0 0 1 16 6.8V11" />
        <path d="M6.5 11v4.5h11V11" />
        <path d="M8 15.5V20" />
        <path d="M16 15.5V20" />
      </>
    );
  }

  if (type === "bed") {
    return (
      <>
        <path d="M4.5 9.5V19" />
        <path d="M19.5 12.5V19" />
        <path d="M4.5 13h15" />
        <path d="M7 9.5h4.2a2 2 0 0 1 2 2V13" />
        <path d="M6.5 19h13" />
      </>
    );
  }

  if (type === "bookcase") {
    return (
      <>
        <path d="M5.5 4.5h13v15h-13z" />
        <path d="M5.5 9.5h13" />
        <path d="M5.5 14.5h13" />
        <path d="M9 5v4.5" />
        <path d="M13 9.5V14" />
        <path d="M16 14.5v5" />
      </>
    );
  }

  if (type === "painting") {
    return (
      <>
        <path d="M4.5 6h15v12h-15z" />
        <path d="m7.5 15 3.2-3.3 2.4 2.5 1.6-1.7 2.8 2.5" />
        <path d="M15.8 9.2h.1" />
      </>
    );
  }

  if (type === "safe") {
    return (
      <>
        <path d="M5 6h14v12H5z" />
        <path d="M8 9h4" />
        <path d="M15.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
        <path d="M13 9.5v5" />
        <path d="M10.5 12h5" />
      </>
    );
  }

  if (type === "clock") {
    return (
      <>
        <path d="M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        <path d="M12 8v4l3 2" />
        <path d="M8 3.8 6.5 5.2" />
        <path d="M16 3.8l1.5 1.4" />
      </>
    );
  }

  if (type === "statue") {
    return (
      <>
        <path d="M12 4.2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        <path d="M8.3 15.5a3.7 3.7 0 0 1 7.4 0" />
        <path d="M8 15.5h8" />
        <path d="M9.5 15.5 8.5 20h7l-1-4.5" />
        <path d="M7.5 20h9" />
      </>
    );
  }

  if (type === "candle") {
    return (
      <>
        <path d="M12 4.2c1.4 1.2 2.1 2.4 2.1 3.6a2.1 2.1 0 1 1-4.2 0c0-1 .7-2.1 2.1-3.6Z" />
        <path d="M9.5 11h5v7.5h-5z" />
        <path d="M8 18.5h8" />
        <path d="M10 13.5h4" />
      </>
    );
  }

  return <path d="M6 6h12v12H6z" />;
}

export function ObjectIcon({ type, className = "objectIcon" }: ObjectIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {iconPaths(type)}
    </svg>
  );
}
