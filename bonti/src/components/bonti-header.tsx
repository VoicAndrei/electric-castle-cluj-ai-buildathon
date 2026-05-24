import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BontiAvatar } from "@/components/bonti-avatar";

// Pre-ticket / marketing surface header (used by / and /match). Anonymous-
// friendly — no sign-in here. Auth lives inside /app where the personalized
// features (Group, Pings, Compass deep-links) actually need it.
export function BontiHeader() {
  return (
    <header className="sticky top-0 z-10 bg-bonti-toolbar px-4 sm:px-6 py-3 sm:py-4">
      <div className="max-w-2xl mx-auto flex justify-between items-center gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BontiAvatar size="sm" decorative />
          <div className="min-w-0">
            <h1 className="text-bonti-red text-xl sm:text-2xl font-sofia leading-none">
              {BRAND.name}
            </h1>
            <p className="text-white/60 text-[10px] sm:text-xs font-roboto mt-0.5 sm:mt-1 truncate">
              {BRAND.festival.edition} · {BRAND.festival.dates}
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/match"
            className="text-white/80 hover:text-white text-xs sm:text-sm font-roboto"
          >
            Match
          </Link>
          <Link
            href="/app"
            className="bg-bonti-red text-white font-sofia uppercase px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded"
          >
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}
