"use client";

import type { ChatMessage } from "@/types/chat";
import { BontiAvatar } from "@/components/bonti-avatar";

export function MessageList({
  messages,
  loading = false,
}: {
  messages: ChatMessage[];
  loading?: boolean;
}) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex items-start gap-3">
        <BontiAvatar size="sm" decorative />
        <p className="text-bonti-text/60 font-roboto text-base pt-1.5">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) =>
        m.role === "user" ? (
          <div
            key={i}
            className="self-end max-w-[80%] bg-bonti-toolbar text-white font-roboto px-4 py-2 rounded-lg"
          >
            {m.content}
          </div>
        ) : (
          <div key={i} className="self-start flex items-start gap-2 max-w-[85%]">
            <BontiAvatar size="sm" animated={false} decorative />
            <div className="bg-bonti-surface text-bonti-text font-roboto px-4 py-3 rounded-lg border border-black/5">
              {m.content}
            </div>
          </div>
        ),
      )}
      {loading && (
        <div className="self-start flex items-start gap-2">
          <BontiAvatar size="sm" decorative />
          <div className="bg-bonti-surface text-bonti-text/60 font-roboto px-4 py-3 rounded-lg border border-black/5 inline-flex gap-1.5 items-center">
            <span className="size-1.5 bg-current rounded-full animate-pulse" />
            <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.15s]" />
            <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.3s]" />
          </div>
        </div>
      )}
    </div>
  );
}
