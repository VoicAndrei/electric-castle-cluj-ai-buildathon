import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — SERVER ONLY. Never import from client components.
 * Used by ingestion scripts and privileged server actions.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
