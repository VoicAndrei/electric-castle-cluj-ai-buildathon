import { VENUE, METERS_PER_UNIT, type VenuePoint } from "@/data/venue";

export function distanceMeters(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy) * METERS_PER_UNIT;
}

// 0 = north (target above), 90 = east, CW positive
export function bearingDegrees(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y; // SVG y grows downward; "north" = lower y
  let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
}

export function formatWalkTime(meters: number): string {
  if (meters < 30) return "<1 min";
  const minutes = Math.round(meters / 65); // ~65 m/min slow walking through a crowd
  return `~${Math.max(1, minutes)} min`;
}

export function formatVenueForPrompt(): string {
  return VENUE.map(v => {
    const tags = [
      `id=${v.id}`,
      `kind=${v.kind}`,
      v.lineProbability ? `lineProbability=${v.lineProbability}` : null,
      v.bonti_blurb ? `note="${v.bonti_blurb}"` : null,
    ].filter(Boolean).join(" ");
    return `- ${v.name} [${tags}]`;
  }).join("\n");
}

export function findVenueById(id: string): VenuePoint | undefined {
  return VENUE.find(v => v.id === id);
}
