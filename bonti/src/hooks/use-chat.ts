"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Lang, Mode } from "@/types/chat";

export function useChat(opts?: { mode?: Mode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string, lang?: Lang) => {
    setLoading(true);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

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
