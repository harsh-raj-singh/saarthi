import { json, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  return json({
    ok: true,
    name: "Saarthi",
    time: new Date().toISOString(),
  });
}
