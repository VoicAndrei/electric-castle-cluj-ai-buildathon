import { AppTabbar } from "@/components/app-tabbar";
import { GlobalPingToast } from "@/components/global-ping-toast";
import { BontiChatFAB } from "@/components/bonti-chat-fab";
import { BroadcastsRealtimeMount } from "@/components/broadcasts-realtime-mount";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bonti-bg">
      {/* AppHeader renders per-page so each surface sets its own title.
          pb-20 (= 80px) clears the fixed AppTabbar (56px) + safe-area
          inset on iOS. */}
      <main className="mx-auto w-full max-w-[480px] pb-20">{children}</main>
      <AppTabbar />
      <BroadcastsRealtimeMount lang="ro" />
      <GlobalPingToast />
      <BontiChatFAB />
    </div>
  );
}
