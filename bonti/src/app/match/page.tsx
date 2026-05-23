"use client";

import { useState } from "react";
import { BontiHeader } from "@/components/bonti-header";
import { MatchForm } from "@/components/match-form";
import { MatchCard } from "@/components/match-card";
import type { MatchOutput } from "@/lib/music-match/match-schema";
import type { Lang } from "@/types/chat";

export default function MatchPage() {
  const [lang] = useState<Lang>("en");
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-bonti-bg flex flex-col">
      <BontiHeader user={null} />
      <section className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-bonti-ink">Match your music to EC12</h1>
          <p className="text-sm text-bonti-ink/70">
            Paste a playlist. Bonți tells you what&apos;s yours at the festival.
          </p>
        </header>
        <MatchForm lang={lang} onResult={setResult} onLoadingChange={setLoading} />
        {loading ? (
          <p className="text-sm text-bonti-ink/60">Bonți is listening…</p>
        ) : result ? (
          <MatchCard result={result} />
        ) : null}
      </section>
    </main>
  );
}
