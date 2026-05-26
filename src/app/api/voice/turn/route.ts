import { json, optionsResponse } from "@/lib/cors";
import { generateVoiceReply, type VoiceTurnContext } from "@/lib/openai";
import {
  arrayBufferToBase64,
  synthesizeWithVoiceService,
  transcribeWithVoiceService,
} from "@/lib/voice-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_REQUEST_BYTES = 18 * 1024 * 1024;

function allowedOrigins() {
  return (process.env.SAARTHI_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(request: Request) {
  const origins = allowedOrigins();
  if (!origins.length) {
    return true;
  }

  const origin = request.headers.get("origin");
  return !origin || origins.includes(origin);
}

export function OPTIONS() {
  return optionsResponse();
}

function parseContext(value: FormDataEntryValue | null): VoiceTurnContext {
  if (typeof value !== "string") {
    return {};
  }

  try {
    return JSON.parse(value) as VoiceTurnContext;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return json({ ok: false, error: "This origin is not allowed to use Saarthi." }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, error: "Voice request is too large." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "Invalid voice upload." }, { status: 400 });
    }
    const audio = form.get("audio");
    const context = parseContext(form.get("context"));

    if (!(audio instanceof File)) {
      return json({ ok: false, error: "Missing audio recording." }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return json({ ok: false, error: "Audio recording is too large." }, { status: 413 });
    }

    const transcript = await transcribeWithVoiceService(audio);
    if (!transcript.text) {
      return json({
        ok: false,
        error: "I could not hear enough speech. Please try again closer to the microphone.",
      }, { status: 400 });
    }

    const reply = await generateVoiceReply(transcript.text, context);
    const speech = await synthesizeWithVoiceService(reply);

    return json({
      ok: true,
      transcript: transcript.text,
      reply,
      audio: {
        contentType: speech.contentType,
        base64: arrayBufferToBase64(speech.audio),
      },
      models: {
        asr: transcript.model,
        tts: speech.model,
        llm: process.env.OPENAI_MODEL?.trim() || "gpt-5.5-mini",
      },
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Saarthi could not process that voice turn.",
      },
      { status: 500 },
    );
  }
}
