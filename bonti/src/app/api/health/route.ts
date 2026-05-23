import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  // Reachability = the request round-tripped to Supabase (got any response, even an error).
  // A network failure (DNS, unreachable, refused) would throw, not return an error object.
  try {
    const { error } = await supabase.from("pg_stat_database").select("datname").limit(1);
    return NextResponse.json({
      env_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_reachable: true,
      error_code: error?.code ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({
      env_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_reachable: false,
      error_code: message,
    });
  }
}
