import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe.skipIf(!url || !anonKey)("RLS — anonymous reads allowed, anonymous writes blocked", () => {
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });

  it("lineup_entries: anon SELECT succeeds", async () => {
    const { data, error } = await anon.from("lineup_entries").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("lineup_entries: anon INSERT blocked", async () => {
    const { error } = await anon.from("lineup_entries").insert({
      artist_name: "rls-test", day: "Friday", stage: "RLS Test",
    });
    expect(error).not.toBeNull();
  });

  it("events: anon INSERT blocked (must route through /api/events)", async () => {
    const { error } = await anon.from("events").insert({ type: "chat_message", payload: {} });
    expect(error).not.toBeNull();
  });

  it("broadcasts: anon SELECT succeeds (Plan 3a)", async () => {
    const { error } = await anon.from("broadcasts").select("id").limit(1);
    expect(error).toBeNull();
  });

  it("broadcasts: anon INSERT blocked", async () => {
    const { error } = await anon.from("broadcasts").insert({ source_text: "x", final_en: "x", final_ro: "x" });
    expect(error).not.toBeNull();
  });
});
