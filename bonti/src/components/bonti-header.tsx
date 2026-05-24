import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SignInButton } from "@/components/sign-in-button";
import { BontiAvatar } from "@/components/bonti-avatar";

export function BontiHeader({ user }: { user: { email?: string | null } | null }) {
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
        {user ? (
          <span className="text-white font-roboto text-sm">{user.email}</span>
        ) : (
          <SignInButton />
        )}
      </nav>
    </header>
  );
}
