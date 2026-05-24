"use client";

import { useCallback, useEffect, useState } from "react";

// Single source of truth for whether the user is treating this session as
// "on-site at the festival". Off-site → /app renders chat-first (planning
// register). On-site → /app renders festival surfaces (hero, ticker, tiles)
// and the chat FAB sits above the tab bar.
//
// Persisted in localStorage so a reload doesn't dump an on-site user back
// into planning mode. URL override (?onsite=1 / ?onsite=0) is honored on
// first load — useful for demo links and dev — and persists.
//
// Multiple components call this hook (e.g. /app/page.tsx and the chat FAB
// living in AppLayout). Each useState is independent, so when one of them
// calls setOnSite the others need to be told to re-read. We dispatch a
// same-window custom event from setOnSite and listen for both that and
// the cross-tab `storage` event in every instance.
//
// `onSite` is `null` until the hook has read localStorage on the client.
// Consumers should treat null as "loading" and skip rendering mode-
// dependent UI until it resolves, to prevent a chat→tiles flash.

const KEY = "bonti_on_site";
const EVENT = "bonti-on-site-change";

export type OnSiteMode = {
  onSite: boolean | null;
  setOnSite: (next: boolean) => void;
};

function readPersisted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function useOnSiteMode(): OnSiteMode {
  const [onSite, setState] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const param = new URL(window.location.href).searchParams.get("onsite");
    let initial: boolean;
    if (param === "1" || param === "true") initial = true;
    else if (param === "0" || param === "false") initial = false;
    else initial = readPersisted();

    window.localStorage.setItem(KEY, initial ? "1" : "0");
    // Tri-state hydration: we deliberately render once with null so the
    // mode-dependent shell doesn't flash chat→tiles (or tiles→chat) while
    // we read localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(initial);

    const onChange = () => setState(readPersisted());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setOnSite = useCallback((next: boolean) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, next ? "1" : "0");
    // Notify other instances of this hook in the same window. The native
    // `storage` event only fires cross-tab, so without this same-window
    // listeners would never hear about the change.
    window.dispatchEvent(new Event(EVENT));
    setState(next);
  }, []);

  return { onSite, setOnSite };
}
