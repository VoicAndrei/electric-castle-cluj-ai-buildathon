import { BontiHeader } from "@/components/bonti-header";
import { ChatShell } from "@/components/chat-shell";

export default function Home() {
  return (
    <main className="min-h-screen bg-bonti-bg flex flex-col">
      <BontiHeader />
      <ChatShell />
    </main>
  );
}
