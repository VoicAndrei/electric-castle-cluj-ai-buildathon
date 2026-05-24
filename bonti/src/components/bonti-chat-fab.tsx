"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import { ChatShell } from "@/components/chat-shell";
import { useOnSiteMode } from "@/lib/festival/use-on-site-mode";

// Chat affordance for the festival surface. Rendered by AppLayout on every
// /app/* route, but only visible when the session is on-site — off-site
// users have the chat as the /app page itself, so a FAB would be redundant.
export function BontiChatFAB() {
  const pathname = usePathname();
  const { onSite } = useOnSiteMode();
  const [open, setOpen] = useState(false);

  if (!pathname.startsWith("/app")) return null;
  if (onSite !== true) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat with Bonți"
        className="fixed z-30 right-4 bottom-20 size-14 rounded-full bg-bonti-red shadow-lg flex items-center justify-center"
      >
        <BontiAvatar size="sm" animated />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-bonti-surface rounded-t-2xl pt-3 pb-4 mx-auto max-w-[480px] flex flex-col h-[70dvh]"
            >
              <div className="w-10 h-1 bg-bonti-text/20 rounded-full mx-auto" />
              <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                <p className="font-sofia uppercase text-sm">Ask Bonți</p>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-bonti-text/60">×</button>
              </div>
              <ChatShell mode="in_festival" layout="fill" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
