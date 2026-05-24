import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "bonti-session-id";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  try {
    store.set(SESSION_COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: THIRTY_DAYS_SECONDS,
      path: "/",
    });
  } catch {
    // Server Components have read-only cookies. Caller must set explicitly
    // on the Response in those contexts (handled in /api/events route).
  }
  return id;
}
