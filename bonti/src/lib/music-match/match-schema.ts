import { z } from "zod";

export const MatchPickSchema = z.object({
  artist: z.string().min(1),
  day: z.enum(["Friday", "Saturday", "Sunday"]),
  stage: z.string().min(1),
  reason: z.string().min(1).max(200),
});

export const MatchSkipSchema = z.object({
  artist: z.string().min(1),
  reason: z.string().min(1).max(160),
});

export const MatchOutputSchema = z.object({
  intro: z.string().min(1).max(280),
  picks: z.array(MatchPickSchema).max(12),
  skips: z.array(MatchSkipSchema).max(6),
});

export type MatchOutput = z.infer<typeof MatchOutputSchema>;
export type MatchPick = z.infer<typeof MatchPickSchema>;
export type MatchSkip = z.infer<typeof MatchSkipSchema>;
