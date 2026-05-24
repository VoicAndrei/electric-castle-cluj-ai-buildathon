import { describe, expect, it } from "vitest";
import {
  EventTypeSchema,
  EventPayloadSchemas,
  EVENT_TYPES,
  type EventType,
  type EventPayloadByType,
} from "@/lib/telemetry/events";

describe("telemetry event taxonomy", () => {
  it("exposes all 11 event types", () => {
    expect(EVENT_TYPES).toEqual([
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
    ]);
  });

  it("EventTypeSchema accepts known types and rejects unknown", () => {
    expect(EventTypeSchema.parse("chat_message")).toBe("chat_message");
    expect(() => EventTypeSchema.parse("bogus")).toThrow();
  });

  it("chat_message payload validates required keys", () => {
    const schema = EventPayloadSchemas.chat_message;
    expect(schema.parse({
      user_message_len: 12,
      response_len: 200,
      retrieved_chunk_count: 4,
      locale: "en",
    })).toBeDefined();
    expect(() => schema.parse({ user_message_len: 12 })).toThrow();
  });

  it("compass_query stores query_len, not raw query (PII)", () => {
    const schema = EventPayloadSchemas.compass_query;
    const ok = schema.parse({ query_len: 42, target_venue_id: "main-stage", latency_ms: 800 });
    expect(ok.query_len).toBe(42);
    expect("query" in ok).toBe(false);
  });

  it("ping_shown requires ping_id and urgent", () => {
    expect(EventPayloadSchemas.ping_shown.parse({ ping_id: "x", urgent: false })).toBeDefined();
    expect(() => EventPayloadSchemas.ping_shown.parse({ ping_id: "x" })).toThrow();
  });

  it("EventPayloadByType is type-safe at compile time", () => {
    const fn = <T extends EventType>(type: T, payload: EventPayloadByType[T]): void => {
      void [type, payload];
    };
    fn("lineup_view", { day: "Friday", language: "en", has_match: true });
    fn("broadcast_received", { broadcast_id: "id", latency_ms: 1200 });
  });
});
