import { z } from "zod";
import { generateText } from "ai";
import { BONTI_LLM, FALLBACK_MODELS, getOpenRouterFor } from "@/lib/openrouter";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { buildDraftPrompt } from "@/lib/admin/draft-prompt";
import { extractDraftJson } from "@/lib/admin/draft-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  source_text: z.string().min(1).max(280),
  target_venue_id: z.string().nullable().optional(),
  urgency: z.enum(["standard", "critical"]),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad_request", detail: (e as Error).message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const prompt = buildDraftPrompt({
    source_text: body.source_text,
    target_venue_id: body.target_venue_id ?? null,
    urgency: body.urgency,
  });

  const candidates: Array<{ model: ReturnType<typeof getOpenRouterFor>; label: string }> = [
    { model: BONTI_LLM, label: "auto-router" },
    ...FALLBACK_MODELS.map((id) => ({ model: getOpenRouterFor(id), label: id })),
  ];

  let lastErr: unknown = null;
  for (const { model, label } of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxRetries: 0,
        abortSignal: controller.signal,
      });
      clearTimeout(timer);
      if (!text?.trim()) throw new Error(`Empty from ${label}`);
      const draft = extractDraftJson(text);
      return Response.json(draft);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`[admin/draft] ${label} failed:`, (e as Error).message);
    }
  }
  return new Response(
    JSON.stringify({ error: "draft_failed", detail: (lastErr as Error)?.message ?? "unknown" }),
    { status: 502, headers: { "content-type": "application/json" } },
  );
}
