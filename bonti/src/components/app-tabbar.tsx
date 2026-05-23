"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app",               label: "Home",     icon: "🏰" },
  { href: "/app/compass",       label: "Compass",  icon: "🧭" },
  { href: "/app/group",         label: "Group",    icon: "👥" },
  { href: "/app/lineup",        label: "Lineup",   icon: "🎤" },
  { href: "/app/notifications", label: "Pings",    icon: "🔔" },
];

export function AppTabbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 bg-bonti-surface border-t border-black/5 pb-safe">
      <ul className="flex h-14">
        {TABS.map((t) => {
          const active =
            t.href === "/app" ? pathname === "/app" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={[
                  "h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-roboto uppercase tracking-wide",
                  active ? "text-bonti-red" : "text-bonti-text/60",
                ].join(" ")}
              >
                <span aria-hidden className="text-lg leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
