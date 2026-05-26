import { getOpenAiApiKey } from "@/lib/env";

const OPENAI_TIMEOUT_MS = 45_000;

type ElementSummary = {
  tagName?: string;
  type?: string | null;
  role?: string | null;
  id?: string | null;
  className?: string | null;
  name?: string | null;
  innerText?: string | null;
  ariaLabel?: string | null;
  title?: string | null;
  placeholder?: string | null;
  href?: string | null;
  value?: string | null;
  selector?: string | null;
  private?: boolean;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type PageSummary = {
  url?: string;
  title?: string;
  viewport?: { width: number; height: number };
  scroll?: { x: number; y: number };
  cursor?: { x: number; y: number };
};

export type VoiceTurnContext = {
  siteId?: string;
  sessionId?: string;
  capturedAt?: string;
  page?: PageSummary;
  element?: ElementSummary;
  visibleControls?: ElementSummary[];
};

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

  return text || "I heard you, but I could not form a useful answer yet.";
}

function compactVoiceContext(context: VoiceTurnContext, transcript: string) {
  return {
    spoken_request: transcript,
    page: context.page,
    element_under_cursor: context.element,
    visible_controls: context.visibleControls?.slice(0, 24) ?? [],
    instructions:
      "Give spoken website guidance for a non-technical English-speaking user. Only explain or verbally navigate. Do not click, fill, submit, purchase, delete, or claim that you changed the page. If the user asks what something is, explain the element under the cursor. If they ask what to do next, use visible controls to describe the next safe visible step. Keep the answer under 70 words.",
  };
}

export async function generateVoiceReply(transcript: string, context: VoiceTurnContext) {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in .env.local or production env vars.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.5-mini";
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
            "You are Saarthi, a calm in-page voice guide for websites. Speak plainly. Help the user understand what is on the page and verbally navigate to the next step. Do not mention DOM, selectors, screenshots, or internal tools.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(compactVoiceContext(context, transcript), null, 2),
            },
          ],
        },
      ],
      max_output_tokens: 180,
    }),
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });

  const data = (await response.json().catch(() => ({}))) as OpenAiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with ${response.status}`);
  }

  return extractOutput(data);
}
