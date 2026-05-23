"use client";

import type { ChatMessage } from "@/types/chat";

export function MessageList({
  messages,
  loading = false,
}: {
  messages: ChatMessage[];
  loading?: boolean;
}) {
  if (messages.length === 0 && !loading) {
    return (
      <p className="text-bonti-text/60 font-roboto text-base">
        Castle&apos;s in 8 weeks. What&apos;s on your mind?
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            m.role === "user"
              ? "self-end max-w-[80%] bg-bonti-toolbar text-white font-roboto px-4 py-2 rounded-lg"
              : "self-start max-w-[80%] bg-bonti-surface text-bonti-text font-roboto px-4 py-3 rounded-lg border border-black/5"
          }
        >
          {m.content}
        </div>
      ))}
      {loading && (
        <div className="self-start bg-bonti-surface text-bonti-text/60 font-roboto px-4 py-3 rounded-lg border border-black/5 inline-flex gap-1.5 items-center">
          <span className="size-1.5 bg-current rounded-full animate-pulse" />
          <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.15s]" />
          <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.3s]" />
        </div>
      )}
    </div>
  );
}
