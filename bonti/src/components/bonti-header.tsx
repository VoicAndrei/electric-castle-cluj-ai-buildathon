import { BRAND } from "@/lib/brand";
import { SignInButton } from "@/components/sign-in-button";

export function BontiHeader({ user }: { user: { email?: string | null } | null }) {
  return (
    <header className="sticky top-0 z-10 bg-bonti-toolbar px-6 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-bonti-red text-2xl font-sofia leading-none">
          {BRAND.name}
        </h1>
        <p className="text-white/60 text-xs font-roboto mt-1">
          {BRAND.festival.edition} · {BRAND.festival.dates}
        </p>
      </div>
      {user ? (
        <span className="text-white font-roboto text-sm">{user.email}</span>
      ) : (
        <SignInButton />
      )}
    </header>
  );
}
