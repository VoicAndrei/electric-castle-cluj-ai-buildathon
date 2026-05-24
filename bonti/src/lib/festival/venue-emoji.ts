import type { VenueKind } from "@/data/venue";

export const KIND_EMOJI: Record<VenueKind, string> = {
  stage:     "🎤",
  beer:      "🍺",
  food:      "🍕",
  bathroom:  "🚻",
  beach:     "🏖️",
  campsite:  "⛺",
  village:   "🏘️",
  shuttle:   "🚌",
  first_aid: "⛑️",
};

export function emojiForKind(kind: VenueKind): string {
  return KIND_EMOJI[kind];
}
