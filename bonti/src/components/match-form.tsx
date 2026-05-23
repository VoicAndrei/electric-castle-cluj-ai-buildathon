"use client";

import { useState } from "react";
import type { MatchOutput } from "@/lib/music-match/match-schema";
import type { Lang } from "@/types/chat";

type Props = {
  lang: Lang;
  onResult: (result: MatchOutput) => void;
  onLoadingChange: (loading: boolean) => void;
};

const COPY = {
  en: {
    urlLabel: "Paste a public Spotify playlist URL",
    urlPlaceholder: "https://open.spotify.com/playlist/…",
    freeformToggle: "or paste a list of artists",
    freeformPlaceholder: "Glass Animals, Tame Impala, LP, Fred again..",
    submit: "Match my music",
    submitting: "Listening…",
  },
  ro: {
    urlLabel: "Paste link-ul unui playlist Spotify public",
    urlPlaceholder: "https://open.spotify.com/playlist/…",
    freeformToggle: "sau scrie o listă de artiști",
    freeformPlaceholder: "Glass Animals, Tame Impala, LP, Fred again..",
    submit: "Match-uiește muzica",
    submitting: "Ascult…",
  },
} as const;

export function MatchForm({ lang, onResult, onLoadingChange }: Props) {
  const [mode, setMode] = useState<"url" | "freeform">("url");
  const [url, setUrl] = useState("");
  const [freeform, setFreeform] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = COPY[lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    onLoadingChange(true);
    try {
      const body = mode === "url" ? { url, lang } : { freeform, lang };
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`);
      }
      onResult((await res.json()) as MatchOutput);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      onLoadingChange(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 w-full">
      {mode === "url" ? (
        <label className="block">
          <span className="block text-sm font-medium mb-1 text-bonti-ink">{c.urlLabel}</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={c.urlPlaceholder}
            className="w-full rounded-md border px-3 py-2 bg-white"
            required
          />
        </label>
      ) : (
        <label className="block">
          <span className="block text-sm font-medium mb-1 text-bonti-ink">{c.freeformToggle}</span>
          <textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder={c.freeformPlaceholder}
            rows={4}
            className="w-full rounded-md border px-3 py-2 bg-white"
            required
          />
        </label>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMode(mode === "url" ? "freeform" : "url")}
          className="text-sm underline text-bonti-ink/70"
        >
          {mode === "url" ? c.freeformToggle : c.urlLabel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-bonti-red text-white px-4 py-2 disabled:opacity-50"
        >
          {submitting ? c.submitting : c.submit}
        </button>
      </div>

      {error ? <p className="text-sm text-bonti-red">{error}</p> : null}
    </form>
  );
}
