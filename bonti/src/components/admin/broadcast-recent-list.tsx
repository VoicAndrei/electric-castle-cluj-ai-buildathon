"use client";

type Row = {
  id: string;
  title_en: string;
  title_ro: string;
  final_en: string;
  final_ro: string;
  urgency: "standard" | "critical";
  sent_at: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function BroadcastRecentList({ initial }: { initial: Row[] }) {
  if (initial.length === 0) {
    return <p className="font-roboto text-sm text-bonti-text/60">No broadcasts in the last 24 hours.</p>;
  }
  return (
    <ul className="bg-white rounded-lg shadow-sm divide-y divide-black/5">
      {initial.map((r) => (
        <li key={r.id} className="px-4 py-2 flex items-baseline gap-3">
          <span className="font-roboto text-xs text-bonti-text/50 tabular-nums w-12">
            {formatTime(r.sent_at)}
          </span>
          <span className={[
            "font-sofia uppercase text-xs tracking-wide",
            r.urgency === "critical" ? "text-bonti-red" : "text-bonti-text",
          ].join(" ")}>
            {r.title_en || "Live update"}
          </span>
          <span className="font-roboto text-sm text-bonti-text/80 truncate">{r.final_en}</span>
        </li>
      ))}
    </ul>
  );
}
