import { json, optionsResponse } from "@/lib/cors";
import { startElevenLabsCallback } from "@/lib/elevenlabs";
import { normalizePhoneNumber } from "@/lib/phone";
import { getOrCreateSession, markCallStarted } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      sessionId?: string;
      pageUrl?: string;
      pageTitle?: string;
    };

    const sessionId = body.sessionId || crypto.randomUUID();
    const phoneNumber = normalizePhoneNumber(body.phone ?? "");
    getOrCreateSession(sessionId, {
      phoneNumber,
      pageUrl: body.pageUrl,
      pageTitle: body.pageTitle,
    });

    const call = await startElevenLabsCallback({
      phoneNumber,
      sessionId,
      pageUrl: body.pageUrl,
      pageTitle: body.pageTitle,
    });

    markCallStarted(sessionId, {
      phoneNumber,
      conversationId: call.conversation_id,
      callSid: call.callSid,
      message: call.message,
    });

    return json({
      ok: true,
      sessionId,
      conversationId: call.conversation_id,
      callSid: call.callSid,
      message: call.message,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not start the callback.",
      },
      { status: 400 },
    );
  }
}
