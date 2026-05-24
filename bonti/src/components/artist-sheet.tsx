"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useEventLogger } from "@/hooks/use-event-logger";
import type { LineupEntry } from "@/data/lineup";

export function ArtistSheet({ entry, onClose }: { entry: LineupEntry | null; onClose: () => void }) {
  const log = useEventLogger();
  const [blurb, setBlurb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Track the last artist we kicked off a fetch for. Updating state during
  // render based on prop changes is the official React idiom and avoids
  // set-state-in-effect lint errors.
  const [lastArtist, setLastArtist] = useState<string | null>(null);

  if (entry && entry.artist !== lastArtist) {
    setLastArtist(entry.artist);
    setBlurb(null);
    setLoading(true);
  }

  useEffect(() => {
    if (!entry) return;
    const controller = new AbortController();
    fetch("/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artist: entry.artist, lang: "en" }),
      signal: controller.signal,
    })
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(text => {
        if (!controller.signal.aborted) {
          setBlurb(text);
          setLoading(false);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setBlurb("Bonți's thinking… try again later.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    log("artist_blurb_view", {
      artist_name: entry.artist,
      language: "en",
      source: "live",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.artist]);

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-bonti-surface rounded-t-2xl p-5 pb-8 mx-auto max-w-[480px]"
          >
            <div className="w-10 h-1 bg-bonti-text/20 rounded-full mx-auto mb-4" />
            <p className="text-bonti-text/60 text-xs font-roboto uppercase">{entry.day} · {entry.stage}</p>
            <h2 className="text-bonti-text font-sofia uppercase text-2xl mt-1">{entry.artist}</h2>
            <p className="text-bonti-text/70 text-xs font-roboto mt-2">{entry.ec_tags.join(" · ")}</p>
            <p className="text-bonti-text font-roboto text-sm mt-4 min-h-[3rem]">
              {loading ? "Bonți's thinking…" : blurb}
            </p>
            <Link
              href={`/app/compass?target=main_stage`}
              className="mt-5 inline-block bg-bonti-red text-white font-sofia uppercase text-sm rounded-md px-4 py-2"
            >
              Show on compass
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
