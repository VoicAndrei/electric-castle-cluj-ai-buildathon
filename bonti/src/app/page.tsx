import { createClient } from "@/lib/supabase/server";
import { BontiHeader } from "@/components/bonti-header";
import { ChatShell } from "@/components/chat-shell";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-bonti-bg flex flex-col">
      <BontiHeader user={user ? { email: user.email } : null} />
      <ChatShell />
    </main>
  );
}
