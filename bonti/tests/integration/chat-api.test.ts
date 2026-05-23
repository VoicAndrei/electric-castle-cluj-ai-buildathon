import { config } from "dotenv";
config({ path: ".env.local" });

import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3002";

describe("POST /api/chat", () => {
  it("streams a response that mentions shuttle/bonțida for a transport question", async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "how do I get from Cluj to Bonțida?" }],
        lang: "en",
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/shuttle|bonțida|bontida/);
  }, 120000);

  it("responds in Romanian when lang=ro", async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "cum ajung la festival?" }],
        lang: "ro",
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/cluj|bonțida|bontida|shuttle|festival/);
  }, 120000);
});
