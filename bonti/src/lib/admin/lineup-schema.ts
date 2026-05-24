import { z } from "zod";

const isoOrNull = z.union([z.string().datetime(), z.literal(""), z.null()]).transform(
  v => (v ? v : null),
);

const photoUrl = z.union([z.string().url(), z.literal(""), z.null()]).transform(
  v => (v ? v : null),
).refine(
  v => v === null || (!v.toLowerCase().startsWith("javascript:") && !v.toLowerCase().startsWith("data:")),
  { message: "photo_url scheme not allowed" },
);

const refineEndAfterStart = (d: { start_at: string | null; end_at: string | null }) =>
  !d.start_at || !d.end_at || new Date(d.end_at) > new Date(d.start_at);

export const LineupEntryInput = z.object({
  artist_name: z.string().min(1).max(80),
  day: z.enum(["Thursday", "Friday", "Saturday", "Sunday"]),
  stage: z.string().min(1).max(60),
  start_at: isoOrNull,
  end_at: isoOrNull,
  ec_tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  genres: z.array(z.string().min(1).max(40)).max(10).default([]),
  photo_url: photoUrl.nullable().optional().transform(v => v ?? null),
  sort_order: z.number().int().nonnegative().default(0),
}).refine(refineEndAfterStart, { message: "end_at must be after start_at", path: ["end_at"] });

export const LineupEntryPatch = z.object({
  artist_name: z.string().min(1).max(80).optional(),
  day: z.enum(["Thursday", "Friday", "Saturday", "Sunday"]).optional(),
  stage: z.string().min(1).max(60).optional(),
  start_at: isoOrNull.optional(),
  end_at: isoOrNull.optional(),
  ec_tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  genres: z.array(z.string().min(1).max(40)).max(10).optional(),
  photo_url: photoUrl.nullable().optional(),
  sort_order: z.number().int().nonnegative().optional(),
}).refine(
  d => !d.start_at || !d.end_at || new Date(d.end_at) > new Date(d.start_at),
  { message: "end_at must be after start_at", path: ["end_at"] },
);
