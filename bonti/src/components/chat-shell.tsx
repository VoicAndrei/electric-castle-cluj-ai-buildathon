"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import type { Mode } from "@/types/chat";

export function ChatShell({ mode }: { mode?: Mode }) {
  const { messages, loading, send } = useChat({ mode });
  return (
    <section className="flex-1 flex flex-col gap-4 px-4 py-4 w-full">
      <div className="flex-1 flex flex-col">
        <MessageList messages={messages} loading={loading} />
      </div>
      <ChatInput onSubmit={(t) => send(t)} disabled={loading} />
    </section>
  );
}
