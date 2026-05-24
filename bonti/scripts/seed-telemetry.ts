/**
 * Seeds the `events` table with realistic 24h festival activity for demo purposes.
 *
 *   pnpm tsx scripts/seed-telemetry.ts            # dry-run: print plan, no writes
 *   pnpm tsx scripts/seed-telemetry.ts --apply    # clear prior seeded rows + insert
 *   pnpm tsx scripts/seed-telemetry.ts --clear    # clear prior seeded rows only
 *
 * Seeded rows are marked with payload.__seeded = true so re-runs only touch
 * demo data, never real telemetry.
 */
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const CLEAR_ONLY = process.argv.includes("--clear");

const ARTISTS = [
  "Teddy Swims", "LP", "Subtronics", "Sub Focus", "Ben Böhmer",
  "Robin Schulz", "The Cure", "Glass Animals", "Massive Attack",
  "Justin Timberlake", "Mochakk", "Fred again..", "FKJ", "Yves Tumor",
  "Honey Dijon",
];

const VENUES = [
  "main_stage", "hangar_stage", "booha_stage", "banffy_stage",
  "beach_stage", "hideout_stage", "backyard_stage", "ping_pong_stage",
];

const DAYS = ["Thursday", "Friday", "Saturday", "Sunday"] as const;
const LOCALES = ["en", "ro"] as const;
const PERSONAS = ["chill", "rave", "discovery", "indie", "headliner"] as const;

// Realistic festival activity curve over 24h. Index = hour offset back from now.
// Higher weights mean more events landed in that hour bucket.
const HOURLY_WEIGHTS = [
  8, 7, 5, 3, 2, 1, 1, 1.5, 2.5, 3.5, 4.5, 5.5,
  6, 6.5, 7, 7.5, 8.5, 9, 9, 8, 7.5, 9, 9.5, 8.5,
];

function pickWeighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function timestampInHourBack(hourBack: number): string {
  const now = Date.now();
  const start = now - (hourBack + 1) * 3600_000;
  const end = now - hourBack * 3600_000;
  return new Date(start + Math.random() * (end - start)).toISOString();
}

function pickHourBack(): number {
  const buckets = Array.from({ length: 24 }, (_, i) => i);
  return pickWeighted(buckets, HOURLY_WEIGHTS);
}

type EventRow = {
  type: string;
  payload: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
};

const EVENT_TYPE_WEIGHTS = [
  ["chat_message", 38],
  ["lineup_view", 16],
  ["match_completed", 9],
  ["compass_query", 10],
  ["artist_blurb_view", 11],
  ["wait_times_view", 7],
  ["ping_shown", 5],
  ["ping_tapped", 2],
  ["group_converge", 2],
] as const;

function buildPayload(type: string): Record<string, unknown> {
  switch (type) {
    case "chat_message":
      return {
        user_message_len: rand(5, 180),
        response_len: rand(50, 600),
        retrieved_chunk_count: rand(0, 8),
        locale: pick(LOCALES),
      };
    case "lineup_view":
      return {
        day: pick(DAYS),
        language: pick(LOCALES),
        has_match: Math.random() < 0.45,
      };
    case "match_completed":
      return {
        artists_count: rand(3, 10),
        top_artist: pick(ARTISTS),
        top_score: Math.round(Math.random() * 100) / 100,
        persona: pick(PERSONAS),
      };
    case "compass_query":
      return {
        query_len: rand(10, 100),
        target_venue_id: Math.random() < 0.6 ? pick(VENUES) : null,
        latency_ms: rand(200, 1500),
      };
    case "artist_blurb_view":
      return {
        artist_name: pick(ARTISTS),
        language: pick(LOCALES),
        source: Math.random() < 0.7 ? "cache" : "live",
      };
    case "wait_times_view":
      return { sort: Math.random() < 0.7 ? "wait" : "distance" };
    case "ping_shown":
      return { ping_id: randomUUID(), urgent: Math.random() < 0.25 };
    case "ping_tapped":
      return { ping_id: randomUUID(), deeplink: Math.random() < 0.6 ? "/app/lineup" : null };
    case "group_converge":
      return { venue_id: pick(VENUES), friend_count: rand(2, 6) };
    default:
      return {};
  }
}

function generateRows(): EventRow[] {
  const rows: EventRow[] = [];

  // ~60 sessions, each fires 5-25 events clustered around a primary hour.
  const SESSION_COUNT = 60;
  for (let s = 0; s < SESSION_COUNT; s++) {
    const sessionId = randomUUID();
    const eventCount = rand(5, 25);
    const primaryHour = pickHourBack();

    for (let i = 0; i < eventCount; i++) {
      const hourBack = Math.max(0, Math.min(23, primaryHour + rand(-2, 2)));
      const type = pickWeighted(
        EVENT_TYPE_WEIGHTS.map(([t]) => t),
        EVENT_TYPE_WEIGHTS.map(([, w]) => w),
      );
      rows.push({
        type,
        payload: { ...buildPayload(type), __seeded: true },
        session_id: sessionId,
        created_at: timestampInHourBack(hourBack),
      });
    }
  }

  // Broadcasts: ~6 spread across the day. Each is "received" by 20-80 sessions
  // with a small latency, so the page can show send→receive deltas.
  const broadcastCount = 6;
  for (let b = 0; b < broadcastCount; b++) {
    const broadcastId = randomUUID();
    const sentHourBack = rand(2, 22);
    const sentAt = new Date(timestampInHourBack(sentHourBack));
    const urgency = Math.random() < 0.2 ? "critical" : "standard";

    rows.push({
      type: "broadcast_sent",
      payload: {
        broadcast_id: broadcastId,
        urgency,
        has_target_venue: Math.random() < 0.5,
        language: "en+ro",
        __seeded: true,
      },
      session_id: null,
      created_at: sentAt.toISOString(),
    });

    const recipientCount = rand(20, 80);
    for (let r = 0; r < recipientCount; r++) {
      const latencyMs = rand(80, 4500);
      rows.push({
        type: "broadcast_received",
        payload: {
          broadcast_id: broadcastId,
          latency_ms: latencyMs,
          __seeded: true,
        },
        session_id: randomUUID(),
        created_at: new Date(sentAt.getTime() + latencyMs).toISOString(),
      });
    }
  }

  return rows;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[seed-telemetry] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key);

  if (CLEAR_ONLY || APPLY) {
    console.log("Clearing prior seeded events...");
    const { error: delErr, count } = await sb
      .from("events")
      .delete({ count: "exact" })
      .filter("payload->>__seeded", "eq", "true");
    if (delErr) {
      console.error("[seed-telemetry] clear failed:", delErr.message);
      process.exit(1);
    }
    console.log(`Cleared ${count ?? 0} prior seeded rows.`);
  }

  if (CLEAR_ONLY) return;

  const rows = generateRows();
  console.log(`\nGenerated ${rows.length} events across last 24h.`);

  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + 1;
  console.table(byType);

  if (!APPLY) {
    console.log("\nDry-run. Pass --apply to insert.");
    console.log("Sample row:\n", JSON.stringify(rows[0], null, 2));
    return;
  }

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb.from("events").insert(chunk);
    if (error) {
      console.error(`[seed-telemetry] insert failed at batch ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`Inserted ${i + chunk.length} / ${rows.length}`);
  }
  console.log("Done.");
}

void main();
