import { getOpenAiApiKey } from "@/lib/env";
import type { CaptureContextPayload } from "@/lib/sessions";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

function compactContext(payload: CaptureContextPayload, question: string) {
  return {
    user_question: question,
    page: payload.page,
    element_under_cursor: payload.element,
    instructions:
      "Explain the UI element under the cursor for a non-technical person. Mention what it likely does, why someone would use it, and one safe next step. Keep it under 45 words.",
  };
}

function extractOutput(data: OpenAiResponse) {
  if (data.output_text) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || "I can see this part of the page, but I could not form a useful explanation yet.";
}

export async function explainElementWithVision(payload: CaptureContextPayload, question: string) {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in .env.local or OPENAI_API_KEY_FILE.");
  }

  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are Saarthi, a calm voice assistant helping non-technical web users. Respond in plain spoken language. Do not mention screenshots, DOM, HTML, or model limitations unless necessary.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(compactContext(payload, question), null, 2),
            },
            {
              type: "input_image",
              image_url: payload.screenshots.viewport,
              detail: "low",
            },
            {
              type: "input_image",
              image_url: payload.screenshots.crop400,
              detail: "high",
            },
            {
              type: "input_image",
              image_url: payload.screenshots.crop100,
              detail: "high",
            },
          ],
        },
      ],
      max_output_tokens: 140,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OpenAiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with ${response.status}`);
  }

  return extractOutput(data);
}
