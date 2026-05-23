import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/compass/route";
import { VENUE } from "@/data/venue";

describe("/api/compass", () => {
  it("returns a valid target_id from VENUE for a beer query", async () => {
    const req = new Request("http://localhost/api/compass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "where is the closest beer?", lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(VENUE.some(v => v.id === body.target_id)).toBe(true);
    expect(typeof body.reason).toBe("string");
    expect(typeof body.line_state).toBe("string");
  }, 60_000);

  it("returns 400 on missing query", async () => {
    const req = new Request("http://localhost/api/compass", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
