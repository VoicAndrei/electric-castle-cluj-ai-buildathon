"use client";

import { createClient } from "@/lib/supabase/client";

export default function AdminSignInPage() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin/broadcasts`,
      },
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <h1 className="font-sofia uppercase text-bonti-text text-xl">Bonți Ops</h1>
      <p className="font-roboto text-bonti-text/70 text-sm text-center max-w-xs">
        Sign in with a Google account on the EC ops allowlist.
      </p>
      <button
        onClick={signIn}
        className="bg-bonti-red text-white font-sofia uppercase px-6 py-3 text-sm rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
