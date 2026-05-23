import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/group/converge/route";
import { VENUE } from "@/data/venue";

describe("/api/group/converge", () => {
  it("returns a valid meeting point for 4 positions", async () => {
    const req = new Request("http://localhost/api/group/converge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        positions: [
          { id: "maria",  name: "Maria",  coords: { x: 540, y: 380 } },
          { id: "alex",   name: "Alex",   coords: { x: 360, y: 560 } },
          { id: "ioana",  name: "Ioana",  coords: { x: 500, y: 320 } },
          { id: "andrei", name: "Andrei", coords: { x: 480, y: 660 } },
        ],
        lang: "en",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(VENUE.some(v => v.id === body.meeting_point_id)).toBe(true);
    expect(body.eta_min).toBeGreaterThanOrEqual(3);
    expect(typeof body.en).toBe("string");
    expect(typeof body.ro).toBe("string");
  }, 60_000);

  it("returns 400 on missing positions", async () => {
    const req = new Request("http://localhost/api/group/converge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "en" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
