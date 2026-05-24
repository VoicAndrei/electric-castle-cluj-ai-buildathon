import { describe, expect, it } from "vitest";
import { formatLocalTime, formatLocalRange, toLocalDateTimeInputValue, fromLocalDateTimeInputValue } from "@/lib/festival/time";

describe("formatLocalTime (Europe/Bucharest)", () => {
  it("formats UTC ISO to HH:mm in Bucharest", () => {
    // 2026-07-18 19:00 UTC = 22:00 Bucharest (EEST, UTC+3)
    expect(formatLocalTime("2026-07-18T19:00:00Z")).toBe("22:00");
  });

  it("returns the empty string for null", () => {
    expect(formatLocalTime(null)).toBe("");
  });

  it("formats a range as 'HH:mm–HH:mm'", () => {
    expect(formatLocalRange("2026-07-18T19:00:00Z", "2026-07-18T20:30:00Z")).toBe("22:00–23:30");
  });

  it("returns 'TBA' for fully null range", () => {
    expect(formatLocalRange(null, null)).toBe("TBA");
  });

  it("returns half-open string when one bound missing", () => {
    expect(formatLocalRange("2026-07-18T19:00:00Z", null)).toBe("22:00–?");
    expect(formatLocalRange(null, "2026-07-18T20:30:00Z")).toBe("?–23:30");
  });

  it("roundtrips through datetime-local <input> value", () => {
    const iso = "2026-07-18T19:00:00Z";
    const local = toLocalDateTimeInputValue(iso); // "2026-07-18T22:00" in Bucharest
    expect(local).toBe("2026-07-18T22:00");
    const back = fromLocalDateTimeInputValue(local); // back to UTC ISO
    expect(back).toBe("2026-07-18T19:00:00.000Z");
  });
});
