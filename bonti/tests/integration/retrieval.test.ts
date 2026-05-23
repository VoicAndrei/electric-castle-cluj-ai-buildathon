import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect, beforeAll } from "vitest";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { createAdminClient } from "@/lib/supabase/admin";

describe("hybridRetrieve (integration)", () => {
  beforeAll(async () => {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("kb_chunks")
      .select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      throw new Error("kb_chunks is empty — run `pnpm ingest` before this test");
    }
  });

  it("retrieves transport-related chunks for a transport query", async () => {
    const out = await hybridRetrieve("how do I get from Cluj to Bonțida?", { lang: "en", k: 5 });
    expect(out.length).toBeGreaterThan(0);
    const combined = out.map((c) => c.text).join(" ").toLowerCase();
    expect(combined).toMatch(/shuttle|bonțida|cluj/);
  });

  it("retrieves camping chunks for a camping query", async () => {
    const out = await hybridRetrieve("can I bring my dog to the campsite?", { lang: "en", k: 5 });
    expect(out.length).toBeGreaterThan(0);
    const combined = out.map((c) => c.text).join(" ").toLowerCase();
    expect(combined).toMatch(/pet|dog|ec village|camping/);
  });

  it("respects the k limit", async () => {
    const out = await hybridRetrieve("electric castle", { lang: "en", k: 3 });
    expect(out.length).toBeLessThanOrEqual(3);
  });
});
