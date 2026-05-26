import { getEnv } from "@/lib/env";

const DEFAULT_VOICE_SERVICE_URL = "http://127.0.0.1:8010";
const DEFAULT_TIMEOUT_MS = 90_000;

export type SpeechToTextResult = {
  text: string;
  duration_ms?: number;
  model?: string;
};

export type TextToSpeechResult = {
  audio: ArrayBuffer;
  contentType: string;
  duration_ms?: number;
  model?: string;
};

function serviceBaseUrl() {
  return (getEnv("VOICE_SERVICE_URL") || DEFAULT_VOICE_SERVICE_URL).replace(/\/$/, "");
}

function timeoutSignal() {
  const value = Number(getEnv("VOICE_SERVICE_TIMEOUT_MS") || DEFAULT_TIMEOUT_MS);
  return AbortSignal.timeout(Number.isFinite(value) ? value : DEFAULT_TIMEOUT_MS);
}

function authHeaders(): HeadersInit | undefined {
  const token = getEnv("VOICE_SERVICE_AUTH_TOKEN");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function serviceUnavailableMessage() {
  return [
    `Saarthi voice worker is not reachable at ${serviceBaseUrl()}.`,
    "Start it with `npm run voice:dev` after installing the Python worker dependencies.",
  ].join(" ");
}

async function fetchVoiceService(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Saarthi voice worker timed out. Try again with a shorter question.");
    }
    throw new Error(serviceUnavailableMessage());
  }
}

async function readJsonError(response: Response) {
  const data = await response.clone().json().catch(() => null);
  if (data && typeof data.detail === "string") {
    return data.detail;
  }
  if (data && typeof data.error === "string") {
    return data.error;
  }
  const text = await response.text().catch(() => "");
  return text || `Voice service failed with ${response.status}`;
}

export async function transcribeWithVoiceService(file: File): Promise<SpeechToTextResult> {
  const form = new FormData();
  form.append("audio", file, file.name || "speech.webm");

  const response = await fetchVoiceService(`${serviceBaseUrl()}/asr`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
    signal: timeoutSignal(),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const data = (await response.json()) as SpeechToTextResult;
  return {
    ...data,
    text: data.text?.trim() ?? "",
  };
}

export async function synthesizeWithVoiceService(text: string): Promise<TextToSpeechResult> {
  const response = await fetchVoiceService(`${serviceBaseUrl()}/tts`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
    signal: timeoutSignal(),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  const audio = await response.arrayBuffer();
  return {
    audio,
    contentType: response.headers.get("content-type") || "audio/wav",
    duration_ms: Number(response.headers.get("x-saarthi-duration-ms") || 0) || undefined,
    model: response.headers.get("x-saarthi-model") || undefined,
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}
