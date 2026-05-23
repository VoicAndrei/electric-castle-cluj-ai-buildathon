import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  // We just confirm the client can reach Supabase (querying a system view).
  // Any returned error code other than ECONNREFUSED proves the network round-trip succeeded.
  const { error } = await supabase.from("pg_stat_database").select("datname").limit(1);
  return NextResponse.json({
    ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_reachable: error?.code !== "ECONNREFUSED",
    error_code: error?.code ?? null,
  });
}
