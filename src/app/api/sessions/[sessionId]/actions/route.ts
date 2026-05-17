import { json, optionsResponse } from "@/lib/cors";
import { listPendingActions } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ sessionId: string }>;
};

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(_request: Request, context: Context) {
  const { sessionId } = await context.params;
  return json({
    actions: listPendingActions(sessionId),
  });
}
