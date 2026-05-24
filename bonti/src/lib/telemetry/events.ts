import { z } from "zod";

export const EVENT_TYPES = [
  "chat_message",
  "match_completed",
  "compass_query",
  "group_converge",
  "lineup_view",
  "artist_blurb_view",
  "wait_times_view",
  "ping_shown",
  "ping_tapped",
  "broadcast_sent",
  "broadcast_received",
] as const;

export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

// Per-type payload schemas. KEEP IN SYNC with the events table in
// docs/superpowers/specs/2026-05-24-bonti-lineup-cms-telemetry-design.md §4.
// Additions are non-breaking; removals are NOT (Plan 3c may aggregate on these).
export const EventPayloadSchemas = {
  chat_message: z.object({
    user_message_len: z.number().int().nonnegative(),
    response_len: z.number().int().nonnegative(),
    retrieved_chunk_count: z.number().int().nonnegative(),
    locale: z.enum(["en", "ro"]),
  }),
  match_completed: z.object({
    artists_count: z.number().int().nonnegative(),
    top_artist: z.string().nullable(),
    top_score: z.number().nullable(),
    persona: z.string().nullable(),
  }),
  compass_query: z.object({
    query_len: z.number().int().nonnegative(),
    target_venue_id: z.string().nullable(),
    latency_ms: z.number().nonnegative(),
  }),
  group_converge: z.object({
    venue_id: z.string(),
    friend_count: z.number().int().nonnegative(),
  }),
  lineup_view: z.object({
    day: z.enum(["Thursday", "Friday", "Saturday", "Sunday"]),
    language: z.enum(["en", "ro"]),
    has_match: z.boolean(),
  }),
  artist_blurb_view: z.object({
    artist_name: z.string(),
    language: z.enum(["en", "ro"]),
    source: z.enum(["cache", "live"]),
  }),
  wait_times_view: z.object({
    sort: z.enum(["wait", "distance"]),
  }),
  ping_shown: z.object({
    ping_id: z.string(),
    urgent: z.boolean(),
  }),
  ping_tapped: z.object({
    ping_id: z.string(),
    deeplink: z.string().nullable(),
  }),
  broadcast_sent: z.object({
    broadcast_id: z.string(),
    urgency: z.enum(["standard", "critical"]),
    has_target_venue: z.boolean(),
    language: z.literal("en+ro"),
  }),
  broadcast_received: z.object({
    broadcast_id: z.string(),
    latency_ms: z.number().nonnegative(),
  }),
} as const;

export type EventPayloadByType = {
  [K in EventType]: z.infer<(typeof EventPayloadSchemas)[K]>;
};
