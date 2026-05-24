import { createHash } from "node:crypto";
import { LINEUP } from "@/data/lineup-static";

// Stable fingerprint of the current EC lineup. Mixed into the music-match
// cache key so a lineup update auto-invalidates stale cached matches —
// a returning user with a previously matched playlist gets a fresh match
// against the new lineup instead of last week's picks.
//
// We hash sorted artist names rather than the whole row so trivial
// metadata churn (sort_order tweaks, tag wording, schedule shifts)
// doesn't bust the cache. The fingerprint changes only when artists are
// added, removed, or renamed — which is the only time picks could
// actually change.
export const LINEUP_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify(LINEUP.map((l) => l.artist).sort()))
  .digest("hex")
  .slice(0, 16);
