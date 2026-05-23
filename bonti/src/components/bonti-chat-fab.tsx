"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BontiAvatar } from "@/components/bonti-avatar";
import { ChatShell } from "@/components/chat-shell";

export function BontiChatFAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide FAB on the home page (chat is already on the page) and outside /app.
  if (pathname === "/app" || !pathname.startsWith("/app")) return null;

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
              className="fixed inset-x-0 bottom-0 z-50 bg-bonti-surface rounded-t-2xl pt-3 pb-4 mx-auto max-w-[480px] flex flex-col"
              style={{ height: "70vh" }}
            >
              <div className="w-10 h-1 bg-bonti-text/20 rounded-full mx-auto" />
              <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                <p className="font-sofia uppercase text-sm">Ask Bonți</p>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-bonti-text/60">×</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatShell mode="in_festival" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
