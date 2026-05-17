import { getEnv, requireEnv } from "@/lib/env";

type StartOutboundCallInput = {
  phoneNumber: string;
  sessionId: string;
  pageUrl?: string;
  pageTitle?: string;
};

export type ElevenLabsCallResponse = {
  success: boolean;
  message: string;
  conversation_id: string | null;
  callSid: string | null;
};

export async function startElevenLabsCallback(input: StartOutboundCallInput) {
  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const agentId = requireEnv("ELEVENLABS_AGENT_ID");
  const phoneNumberId = requireEnv("ELEVENLABS_AGENT_PHONE_NUMBER_ID");
  const voiceId = getEnv("ELEVENLABS_VOICE_ID");

  const firstMessage =
    getEnv("SAARTHI_FIRST_MESSAGE") ||
    "Hi, I am Saarthi. I can help you understand and navigate this website. What do you need help with?";

  const agentOverride =
    getEnv("SAARTHI_DISABLE_CALL_OVERRIDES") === "true"
      ? undefined
      : {
          agent: {
            first_message: firstMessage,
          },
          ...(voiceId
            ? {
                tts: {
                  voice_id: voiceId,
                },
              }
            : {}),
        };

  const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: input.phoneNumber,
      conversation_initiation_client_data: {
        type: "conversation_initiation_client_data",
        ...(agentOverride ? { conversation_config_override: agentOverride } : {}),
        dynamic_variables: {
          saarthi_session_id: input.sessionId,
          page_url: input.pageUrl || "Unknown page",
          page_title: input.pageTitle || "Untitled page",
          callback_phone: input.phoneNumber,
        },
        user_id: input.sessionId,
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<ElevenLabsCallResponse> & {
    detail?: unknown;
  };

  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
    throw new Error(detail || `ElevenLabs request failed with ${response.status}`);
  }

  return data as ElevenLabsCallResponse;
}
