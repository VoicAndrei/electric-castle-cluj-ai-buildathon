import { createClient } from "@/lib/supabase/server";

export class AdminAuthError extends Error {
  readonly status: 401 | 403;
  constructor(message: "no_session" | "not_admin") {
    super(message);
    this.name = "AdminAuthError";
    this.status = message === "no_session" ? 401 : 403;
  }
}

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<{
  user: { id: string; email: string };
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new AdminAuthError("no_session");
  if (!allowlist().includes(user.email.toLowerCase())) {
    throw new AdminAuthError("not_admin");
  }
  return { user: { id: user.id, email: user.email } };
}
