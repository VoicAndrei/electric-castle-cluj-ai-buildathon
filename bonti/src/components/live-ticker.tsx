import { SEEDED_BROADCASTS } from "@/data/festival-state";

export function LiveTicker({ lang }: { lang: "en" | "ro" }) {
  const latest = SEEDED_BROADCASTS[SEEDED_BROADCASTS.length - 1];
  if (!latest) return null;
  const text = lang === "ro" ? latest.ro : latest.en;
  return (
    <div className="mx-4 mt-4 mb-2 bg-bonti-toolbar text-white text-xs font-roboto rounded-md px-3 py-2 truncate">
      <span className="opacity-60 mr-2">LIVE</span>
      {text}
    </div>
  );
}
