import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { LineupEntryInput } from "@/lib/admin/lineup-schema";

export const runtime = "nodejs";
export const maxDuration = 10;

function unauthorized(e: AdminAuthError): Response {
  return new Response(JSON.stringify({ error: e.message }), {
    status: e.status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lineup_entries")
    .select("id, artist_name, day, stage, start_at, end_at, ec_tags, genres, photo_url, sort_order, updated_at")
    .order("day", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("artist_name", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: "lineup_db_unavailable", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  let body: ReturnType<typeof LineupEntryInput.parse>;
  try {
    body = LineupEntryInput.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lineup_entries")
    .insert(body)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/lineup] insert failed:", error.message);
    return new Response(JSON.stringify({ error: "insert_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ id: data.id });
}
