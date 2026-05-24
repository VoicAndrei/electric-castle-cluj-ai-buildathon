"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "signed-in"; email: string };

export function AccountChip() {
  const [state, setState] = useState<AuthState>({ kind: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const u = data.user;
      setState(u?.email ? { kind: "signed-in", email: u.email } : { kind: "anon" });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email;
      setState(email ? { kind: "signed-in", email } : { kind: "anon" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (state.kind === "loading") {
    return <span className="size-7 rounded-full bg-white/15 animate-pulse" aria-hidden />;
  }

  if (state.kind === "anon") {
    return (
      <button
        type="button"
        onClick={signIn}
        className="bg-bonti-red text-white font-sofia uppercase text-[10px] px-2.5 py-1 rounded-full tracking-wide"
      >
        Sign in
      </button>
    );
  }

  const initial = state.email.charAt(0).toUpperCase();
  return (
    <button
      type="button"
      onClick={signOut}
      title={`${state.email} · tap to sign out`}
      className="size-7 rounded-full bg-white/90 text-bonti-toolbar font-sofia text-xs font-bold flex items-center justify-center"
    >
      {initial}
    </button>
  );
}
