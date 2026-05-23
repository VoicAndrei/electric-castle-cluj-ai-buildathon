"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";

export function ChatShell() {
  const { messages, loading, send } = useChat();
  return (
    <section className="flex-1 flex flex-col gap-6 px-6 py-8 max-w-2xl w-full mx-auto">
      <div className="flex-1 flex flex-col">
        <MessageList messages={messages} />
      </div>
      <ChatInput onSubmit={(t) => send(t)} disabled={loading} />
    </section>
  );
}
