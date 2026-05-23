import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/match/route";

function req(body: object) {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/match", () => {
  it("rejects empty body with 400", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("returns a structured match for freeform input", async () => {
    const res = await POST(req({ freeform: "Tame Impala, Fred again.., LP", lang: "en" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.picks.length).toBeGreaterThan(0);
    expect(json.intro.length).toBeGreaterThan(0);
  }, 60_000);
});
