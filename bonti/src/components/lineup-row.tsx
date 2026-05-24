import { formatLocalRange } from "@/lib/festival/time";
import type { LineupRow as Row } from "@/hooks/use-lineup-realtime";

type Overlay = "pick" | "skip" | null;

export function LineupRow({ row, overlay, flashing, onClick }: {
  row: Row;
  overlay: Overlay;
  flashing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 border-b border-black/5 flex items-center gap-3 active:bg-bonti-bg transition-colors",
        flashing ? "animate-bonti-shimmer" : "",
      ].join(" ")}
    >
      <div className="flex-1 min-w-0">
        <p className="font-sofia uppercase text-sm tracking-wide truncate">{row.artist_name}</p>
        <p className="font-roboto text-xs text-bonti-text/60 truncate">
          {row.stage} · {row.day} · {formatLocalRange(row.start_at, row.end_at)}
        </p>
      </div>
      {overlay === "pick" && (
        <span className="text-[10px] font-roboto uppercase tracking-wide bg-green-100 text-green-800 rounded-full px-2 py-0.5">
          🟢 Your match
        </span>
      )}
      {overlay === "skip" && (
        <span className="text-[10px] font-roboto uppercase tracking-wide bg-red-100 text-red-800 rounded-full px-2 py-0.5">
          🔴 Skip
        </span>
      )}
    </button>
  );
}
