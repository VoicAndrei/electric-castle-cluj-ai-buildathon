import { describe, it, expect } from "vitest";
import { distanceMeters, bearingDegrees, formatWalkTime } from "@/lib/festival/compass";

describe("compass math", () => {
  it("distanceMeters scales with METERS_PER_UNIT (0.4)", () => {
    expect(distanceMeters({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(40, 1);
    expect(distanceMeters({ x: 0, y: 0 }, { x: 0, y: 200 })).toBeCloseTo(80, 1);
  });

  it("bearingDegrees is 0 for due-north (target above origin), CW positive", () => {
    expect(bearingDegrees({ x: 100, y: 100 }, { x: 100, y: 0 })).toBeCloseTo(0, 0);
    expect(bearingDegrees({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(90, 0);
    expect(bearingDegrees({ x: 0, y: 0 }, { x: 0, y: 100 })).toBeCloseTo(180, 0);
    expect(bearingDegrees({ x: 100, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(270, 0);
  });

  it("formatWalkTime returns ~1 min for 60m, ~3 min for 200m", () => {
    expect(formatWalkTime(60)).toBe("~1 min");
    expect(formatWalkTime(200)).toBe("~3 min");
    expect(formatWalkTime(15)).toBe("<1 min");
  });
});
