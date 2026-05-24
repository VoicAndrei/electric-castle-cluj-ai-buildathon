"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Lang, Mode } from "@/types/chat";
import type { MatchOutput } from "@/lib/music-match/match-schema";
import { detectSource } from "@/lib/music-match/url-detect";

// Mirrors the server's lang heuristic in /api/chat — duplicated rather than
// shared so a type-only client module doesn't reach into the API folder.
function detectLangClient(text: string): Lang {
  const ro = /\b(și|sau|cu|fără|când|cum|unde|de|la|este|sunt|nu)\b|[ăâîșț]/i;
  return ro.test(text) ? "ro" : "en";
}

// Pulls the first http(s) URL out of a free-text message ("here's my playlist https://…").
function extractUrl(text: string): string | null {
  return text.match(/https?:\/\/\S+/)?.[0] ?? null;
}

export function useChat(opts?: { mode?: Mode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string, lang?: Lang) => {
    setLoading(true);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    const resolvedLang: Lang = lang ?? detectLangClient(text);

    // Spotify-URL shortcut: skip /api/chat and run the inline music match.
    // YT Music / Apple Music URLs fall through to chat — the route returns
    // 501 for those today, and the bot can explain that in plain language.
    const url = extractUrl(text);
    if (url && detectSource(url) === "spotify_url") {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, lang: resolvedLang }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`);
        }
        const result = (await res.json()) as MatchOutput;
        setMessages((m) => [
          ...m,
          { role: "assistant", content: result.intro, match: result },
        ]);
      } catch (err) {
        console.error(err);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Couldn't read that playlist. Make sure it's public, or paste a different Spotify link." },
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, lang, mode: opts?.mode }),
      });
      if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);
      const reply = (await res.text()).trim();
      if (!reply) throw new Error("Empty reply from server");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", content: "Something broke. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, opts]);

  return { messages, loading, send };
}
