"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { Mode } from "@/types/chat";

const PRE_TICKET_PROMPTS = [
  "First time at the Castle — help me plan",
  "I'm coming from Bucharest with 3 friends",
  "How much money do I need?",
  "I don't know the lineup",
  "Convince my friends",
];

const IN_FESTIVAL_PROMPTS = [
  "Where's the closest beer?",
  "Where's a short bathroom line?",
  "I want somewhere quiet for 15 min",
  "What should I see next?",
];

function EmptyState({
  mode,
  onPick,
}: {
  mode: Mode;
  onPick: (text: string) => void;
}) {
  const prompts = mode === "in_festival" ? IN_FESTIVAL_PROMPTS : PRE_TICKET_PROMPTS;
  const intro =
    mode === "in_festival"
      ? "Tell me where you're stuck. I'll point you the shortest way."
      : "Castle's in 8 weeks. What's on your mind?";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BontiAvatar size="sm" decorative />
        <p className="text-bonti-text/80 font-roboto text-base pt-1.5">{intro}</p>
      </div>
      <div className="flex flex-wrap gap-2 pl-11">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="bg-bonti-surface border border-black/10 rounded-full px-3 py-1.5 text-xs font-roboto text-bonti-text hover:bg-black/5 active:scale-[0.98]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatShell({ mode = "pre_ticket" }: { mode?: Mode }) {
  const { messages, loading, send } = useChat({ mode });
  const showEmpty = messages.length === 0 && !loading;

  return (
    <section className="flex-1 flex flex-col gap-4 px-4 py-4 w-full max-w-2xl mx-auto">
      <div className="flex-1 flex flex-col">
        {showEmpty ? (
          <EmptyState mode={mode} onPick={send} />
        ) : (
          <MessageList messages={messages} loading={loading} />
        )}
      </div>
      <ChatInput onSubmit={(t) => send(t)} disabled={loading} />
    </section>
  );
}
