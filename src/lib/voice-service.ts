import { getEnv } from "@/lib/env";

const DEFAULT_VOICE_SERVICE_URL = "http://127.0.0.1:8010";
const DEFAULT_ASR_TIMEOUT_MS = 600_000;
const DEFAULT_TTS_TIMEOUT_MS = 120_000;

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

function timeoutSignal(name: "ASR" | "TTS") {
  const defaultValue = name === "ASR" ? DEFAULT_ASR_TIMEOUT_MS : DEFAULT_TTS_TIMEOUT_MS;
  const specific = getEnv(`VOICE_SERVICE_${name}_TIMEOUT_MS`);
  const value = Number(specific || getEnv("VOICE_SERVICE_TIMEOUT_MS") || defaultValue);
  return AbortSignal.timeout(Math.max(Number.isFinite(value) ? value : defaultValue, defaultValue));
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

async function fetchVoiceService(input: string, init: RequestInit, name: "ASR" | "TTS") {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(
        name === "ASR"
          ? "Parakeet ASR is still warming up on CPU. Wait for the voice worker health to show ASR loaded, then try again."
          : "Piper TTS timed out while generating speech. Try a shorter answer.",
      );
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

  const response = await fetchVoiceService(
    `${serviceBaseUrl()}/asr`,
    {
      method: "POST",
      headers: authHeaders(),
      body: form,
      signal: timeoutSignal("ASR"),
    },
    "ASR",
  );

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
  const response = await fetchVoiceService(
    `${serviceBaseUrl()}/tts`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: timeoutSignal("TTS"),
    },
    "TTS",
  );

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
