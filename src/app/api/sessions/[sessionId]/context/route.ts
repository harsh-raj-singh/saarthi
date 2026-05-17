import { json, optionsResponse } from "@/lib/cors";
import { fulfillCapture, getOrCreateSession, type CaptureContextPayload } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ sessionId: string }>;
};

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request, context: Context) {
  const { sessionId } = await context.params;
  const payload = (await request.json()) as CaptureContextPayload;
  const normalizedPayload = {
    ...payload,
    sessionId,
  };

  getOrCreateSession(sessionId, {
    pageUrl: normalizedPayload.page?.url,
    pageTitle: normalizedPayload.page?.title,
  });

  const fulfilled = fulfillCapture(sessionId, normalizedPayload);
  return json({ ok: true, fulfilled });
}
