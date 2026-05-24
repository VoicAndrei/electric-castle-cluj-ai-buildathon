import { BontiHeader } from "@/components/bonti-header";
import { ChatShell } from "@/components/chat-shell";

export default function Home() {
  // h-[100dvh] (dynamic viewport height) so the input row lands at the
  // *actual* visible bottom on mobile — 100vh would put it under the
  // address bar on iOS / Chrome mobile.
  return (
    <main className="h-[100dvh] bg-bonti-bg flex flex-col overflow-hidden">
      <BontiHeader />
      <ChatShell layout="fill" />
    </main>
  );
}
