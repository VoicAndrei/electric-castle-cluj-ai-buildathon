import Link from "next/link";

const TILES = [
  { href: "/app/compass",       label: "Compass",     icon: "🧭" },
  { href: "/app/group",         label: "Group",       icon: "👥" },
  { href: "/app/lineup",        label: "Lineup",      icon: "🎤" },
  { href: "/app/notifications", label: "Pings",       icon: "🔔" },
  { href: "/app/wait-times",    label: "Wait Times",  icon: "⏱️" },
  { href: "/match",             label: "Match Music", icon: "🎵" },
];

export function AppTileGrid() {
  return (
    <section className="px-4 pt-4 grid grid-cols-2 gap-3">
      {TILES.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="bg-bonti-surface border border-black/5 rounded-xl px-4 py-5 flex flex-col items-start gap-2 active:scale-[0.99] transition-transform"
        >
          <span aria-hidden className="text-2xl leading-none">{t.icon}</span>
          <span className="font-sofia uppercase text-sm tracking-wide">{t.label}</span>
        </Link>
      ))}
    </section>
  );
}
