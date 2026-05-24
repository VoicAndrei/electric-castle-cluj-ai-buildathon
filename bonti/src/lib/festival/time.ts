const TZ = "Europe/Bucharest";

const HHmmInTz = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateInTz = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatLocalTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return HHmmInTz.format(d);
}

export function formatLocalRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return "TBA";
  if (start && !end) return `${formatLocalTime(start)}–?`;
  if (!start && end) return `?–${formatLocalTime(end)}`;
  return `${formatLocalTime(start!)}–${formatLocalTime(end!)}`;
}

/**
 * Convert UTC ISO → datetime-local input value ("YYYY-MM-DDTHH:mm") in Bucharest TZ.
 */
export function toLocalDateTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dateInTz.format(d)}T${HHmmInTz.format(d)}`;
}

/**
 * Convert datetime-local input value ("YYYY-MM-DDTHH:mm") interpreted in
 * Bucharest TZ → UTC ISO.
 */
export function fromLocalDateTimeInputValue(local: string | null | undefined): string | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  // Strategy: bracket-search by constructing a UTC date, then probing tz offset for that date.
  const guess = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  const shown = HHmmInTz.format(guess);
  const [sh, sm] = shown.split(":").map(Number);
  const wantedMinutes = (+h) * 60 + (+mi);
  const shownMinutes = sh * 60 + sm;
  let diff = wantedMinutes - shownMinutes;
  // Normalize into [-12h, +12h] so we don't accidentally jump a whole day
  // when the local clock wraps past midnight relative to the UTC guess.
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  const fixed = new Date(guess.getTime() + diff * 60_000);
  return fixed.toISOString();
}
