import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { LineupEntryPatch } from "@/lib/admin/lineup-schema";

export const runtime = "nodejs";
export const maxDuration = 10;

function unauthorized(e: AdminAuthError): Response {
  return new Response(JSON.stringify({ error: e.message }), {
    status: e.status,
    headers: { "content-type": "application/json" },
  });
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  const { id } = await ctx.params;

  let body: ReturnType<typeof LineupEntryPatch.parse>;
  try {
    body = LineupEntryPatch.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lineup_entries")
    .update(body)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/lineup/:id] PATCH failed:", error.message);
    return new Response(JSON.stringify({ error: "update_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ id: data.id });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  const { id } = await ctx.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("lineup_entries").delete().eq("id", id);

  if (error) {
    console.error("[admin/lineup/:id] DELETE failed:", error.message);
    return new Response(JSON.stringify({ error: "delete_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(null, { status: 204 });
}
