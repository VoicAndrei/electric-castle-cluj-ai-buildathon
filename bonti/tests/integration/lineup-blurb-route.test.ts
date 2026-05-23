import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/lineup/blurb/route";

describe("/api/lineup/blurb", () => {
  it("returns a blurb for a known artist", async () => {
    const req = new Request("http://localhost/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artist: "Glass Animals", lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(5);
  }, 60_000);

  it("returns 400 on missing artist", async () => {
    const req = new Request("http://localhost/api/lineup/blurb", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
