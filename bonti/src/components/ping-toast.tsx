"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { StoredPing } from "@/lib/festival/store";

export function PingToast({ ping, onDismiss }: { ping: StoredPing | null; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);
  // Track the last ping id we activated for. Updating state during render based
  // on prop changes is the official React idiom and avoids set-state-in-effect.
  const [lastPingId, setLastPingId] = useState<string | null>(null);

  if (ping && ping.id !== lastPingId) {
    setLastPingId(ping.id);
    setShown(true);
  }

  // Auto-dismiss timer.
  useEffect(() => {
    if (!ping || !shown) return;
    const t = setTimeout(() => setShown(false), 6_000);
    return () => clearTimeout(t);
  }, [ping, shown]);

  // After exit animation completes, clear the ping.
  useEffect(() => {
    if (!shown && ping) {
      const t = setTimeout(onDismiss, 300);
      return () => clearTimeout(t);
    }
  }, [shown, ping, onDismiss]);

  return (
    <AnimatePresence>
      {ping && shown && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-3 top-3 z-50 mx-auto max-w-[460px] bg-bonti-toolbar text-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-3"
        >
          <BontiAvatar size="sm" animated />
          <Link href={ping.deeplink ?? "/app/notifications"} className="flex-1 min-w-0">
            <p className="font-sofia uppercase text-xs tracking-wide truncate">{ping.title}</p>
            <p className="font-roboto text-sm truncate opacity-90">{ping.body}</p>
          </Link>
          <button
            type="button"
            onClick={() => setShown(false)}
            aria-label="Dismiss"
            className="text-white/60 hover:text-white px-1"
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
