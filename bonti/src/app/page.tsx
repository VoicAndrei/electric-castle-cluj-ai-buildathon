import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-bonti-bg">
      <header className="bg-bonti-toolbar px-6 py-4 flex justify-between items-center">
        <h1 className="text-bonti-red text-2xl font-sofia">
          {BRAND.name} — {BRAND.festival.edition}
        </h1>
        {user ? (
          <span className="text-white font-roboto text-sm">{user.email}</span>
        ) : (
          <SignInButton />
        )}
      </header>
      <section className="px-6 py-8">
        <p className="font-roboto text-base">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </section>
    </main>
  );
}
