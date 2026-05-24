import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BontiAvatar } from "@/components/bonti-avatar";

// Pre-ticket / marketing surface header (used by / and /match). Anonymous-
// friendly — no sign-in here. Auth lives inside /app where the personalized
// features (Group, Pings, Compass deep-links) actually need it.
export function BontiHeader() {
  return (
    <header className="sticky top-0 z-10 bg-bonti-toolbar px-6 py-4 flex justify-between items-center">
      <Link href="/" className="flex items-center gap-3">
        <BontiAvatar size="md" decorative />
        <div>
          <h1 className="text-bonti-red text-2xl font-sofia leading-none">
            {BRAND.name}
          </h1>
          <p className="text-white/60 text-xs font-roboto mt-1">
            {BRAND.festival.edition} · {BRAND.festival.dates}
          </p>
        </div>
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/match"
          className="text-white/80 hover:text-white text-sm font-roboto"
        >
          Match
        </Link>
        <Link
          href="/app"
          className="bg-bonti-red text-white font-sofia uppercase px-4 py-2 text-sm"
        >
          Open app
        </Link>
      </nav>
    </header>
  );
}
