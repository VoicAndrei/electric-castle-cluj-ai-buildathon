import { z } from "zod";
import { EventTypeSchema, EventPayloadSchemas, type EventType } from "@/lib/telemetry/events";
import { logEvent } from "@/lib/telemetry/log-event";
import { getOrCreateSessionId } from "@/lib/telemetry/session";

export const runtime = "nodejs";
export const maxDuration = 5;

const BodySchema = z.object({
  type: EventTypeSchema,
  payload: z.unknown(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const payloadSchema = EventPayloadSchemas[body.type as EventType];
  const payloadParse = payloadSchema.safeParse(body.payload);
  if (!payloadParse.success) {
    return new Response(JSON.stringify({ ok: false, error: "bad_payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const sessionId = await getOrCreateSessionId();
  // Fire-and-forget. Response goes out immediately.
  void logEvent(body.type as EventType, payloadParse.data as never, sessionId);

  return Response.json({ ok: true });
}
