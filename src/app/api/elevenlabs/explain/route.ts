import { json, optionsResponse } from "@/lib/cors";
import { explainElementWithVision } from "@/lib/openai";
import { createCaptureRequest, recordExplanation } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExplainBody = {
  session_id?: string;
  sessionId?: string;
  saarthi_session_id?: string;
  question?: string;
  user_question?: string;
  utterance?: string;
  conversation_id?: string;
  dynamic_variables?: Record<string, unknown>;
};

function readSessionId(body: ExplainBody) {
  const dynamicSession = body.dynamic_variables?.saarthi_session_id;
  return (
    body.session_id ||
    body.sessionId ||
    body.saarthi_session_id ||
    (typeof dynamicSession === "string" ? dynamicSession : undefined)
  );
}

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ExplainBody;
  const sessionId = readSessionId(body);
  const question = body.question || body.user_question || body.utterance || "What is this?";

  if (!sessionId) {
    return json({
      response:
        "I need the browser session to be connected before I can see the part of the page you mean.",
      explanation:
        "I need the browser session to be connected before I can see the part of the page you mean.",
    });
  }

  const { action, waitForContext } = createCaptureRequest(
    sessionId,
    question,
    body.conversation_id,
  );

  try {
    const context = await waitForContext;
    const explanation = await explainElementWithVision(context, question);
    recordExplanation(sessionId, action.id, question, explanation, context.element);

    return json({
      response: explanation,
      explanation,
      action_id: action.id,
      session_id: sessionId,
    });
  } catch (error) {
    const fallback =
      error instanceof Error && error.message.includes("OPENAI_API_KEY")
        ? "I can see the request, but Saarthi still needs the OpenAI vision key configured before I can explain the page."
        : "I could not get a fresh look at your screen in time. Move your cursor back over the item and ask me again.";

    return json({
      response: fallback,
      explanation: fallback,
      action_id: action.id,
      session_id: sessionId,
    });
  }
}
