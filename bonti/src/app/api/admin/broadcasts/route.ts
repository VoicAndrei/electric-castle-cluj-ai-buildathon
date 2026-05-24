import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";

export const runtime = "nodejs";
export const maxDuration = 10;

const PostBodySchema = z.object({
  source_text: z.string().min(1).max(280),
  title_en: z.string().max(60).optional().default(""),
  body_en: z.string().min(1).max(280),
  title_ro: z.string().max(60).optional().default(""),
  body_ro: z.string().min(1).max(280),
  urgency: z.enum(["standard", "critical"]).default("standard"),
  target_venue_id: z.string().nullable().optional(),
  deeplink: z.string().nullable().optional(),
});

function unauthorized(e: AdminAuthError): Response {
  return new Response(JSON.stringify({ error: e.message }), {
    status: e.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  let user: { id: string; email: string };
  try {
    ({ user } = await requireAdmin());
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    body = PostBodySchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createAdminClient();
  const insertRow = {
    source_text: body.source_text,
    final_en: body.body_en,
    final_ro: body.body_ro,
    title_en: body.title_en,
    title_ro: body.title_ro,
    urgency: body.urgency,
    target_venue_id: body.target_venue_id ?? null,
    deeplink: body.deeplink ?? null,
    sent_by: user.id,
  };

  const { data, error } = await supabase
    .from("broadcasts")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/broadcasts] insert failed:", error.message);
    return new Response(JSON.stringify({ error: "insert_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ id: data.id });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) return unauthorized(e);
    throw e;
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("broadcasts")
    .select("id, source_text, final_en, final_ro, title_en, title_ro, urgency, target_venue_id, deeplink, sent_at")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: "select_failed", detail: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return Response.json({ broadcasts: data ?? [] });
}
