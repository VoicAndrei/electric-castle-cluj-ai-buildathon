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
// `onSite` is `null` until the hook has read localStorage on the client.
// Consumers should treat null as "loading" and skip rendering mode-
// dependent UI until it resolves, to prevent a chat→tiles flash.

const KEY = "bonti_on_site";

export type OnSiteMode = {
  onSite: boolean | null;
  setOnSite: (next: boolean) => void;
};

export function useOnSiteMode(): OnSiteMode {
  const [onSite, setState] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URL(window.location.href).searchParams.get("onsite");
    let next: boolean;
    if (param === "1" || param === "true") next = true;
    else if (param === "0" || param === "false") next = false;
    else next = window.localStorage.getItem(KEY) === "1";

    window.localStorage.setItem(KEY, next ? "1" : "0");
    // Tri-state hydration: we deliberately render once with null so the
    // mode-dependent shell doesn't flash chat→tiles (or tiles→chat) while
    // we read localStorage. The "you might not need an effect" alternative
    // (useSyncExternalStore) can't represent the null intermediate without
    // losing SSR hydration safety.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
  }, []);

  const setOnSite = useCallback((next: boolean) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    }
    setState(next);
  }, []);

  return { onSite, setOnSite };
}
