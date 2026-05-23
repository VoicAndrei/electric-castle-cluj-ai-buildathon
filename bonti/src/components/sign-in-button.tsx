"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }
  return (
    <button
      onClick={signIn}
      className="bg-bonti-red text-white font-sofia uppercase px-4 py-2 text-sm"
    >
      Sign in with Google
    </button>
  );
}
