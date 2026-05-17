#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.elevenlabs.io/v1/convai";

function env(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function requireEnv(name) {
  const value = env(name);
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

async function eleven(pathname, body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": requireEnv("ELEVENLABS_API_KEY"),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify(data, null, 2));
  }
  return data;
}

async function upsertLocalEnv(values) {
  const target = path.join(process.cwd(), ".env.local");
  let current = "";
  try {
    current = await readFile(target, "utf8");
  } catch {}

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    current = pattern.test(current)
      ? current.replace(pattern, line)
      : `${current.trimEnd()}\n${line}\n`;
  }

  await writeFile(target, current.trimStart(), "utf8");
}

async function main() {
  const publicBaseUrl = requireEnv("SAARTHI_PUBLIC_URL").replace(/\/$/, "");
  const voiceId = env("ELEVENLABS_VOICE_ID");

  const tool = await eleven("/tools", {
    tool_config: {
      type: "webhook",
      name: "explain_current_element",
      description:
        "Use when the caller asks what the item under their cursor is, such as 'what is this?', 'what am I looking at?', or 'explain this'.",
      response_timeout_secs: 60,
      disable_interruptions: true,
      force_pre_tool_speech: true,
      execution_mode: "immediate",
      api_schema: {
        url: `${publicBaseUrl}/api/elevenlabs/explain`,
        method: "POST",
        content_type: "application/json",
        request_headers: {},
        request_body_schema: {
          type: "object",
          required: ["session_id", "question"],
          description: "Browser session and user question for Saarthi element explanation.",
          properties: {
            conversation_id: {
              type: "string",
              dynamic_variable: "system__conversation_id",
            },
            caller_id: {
              type: "string",
              dynamic_variable: "system__caller_id",
            },
            session_id: {
              type: "string",
              dynamic_variable: "saarthi_session_id",
            },
            page_url: {
              type: "string",
              dynamic_variable: "page_url",
            },
            question: {
              type: "string",
              description: "The caller's latest request in a short phrase.",
            },
          },
        },
      },
      assignments: [
        {
          source: "response",
          dynamic_variable: "last_element_explanation",
          value_path: "explanation",
        },
      ],
    },
  });

  const agent = await eleven("/agents/create", {
    name: "Saarthi",
    tags: ["saarthi", "website-help", "voice-navigation"],
    conversation_config: {
      agent: {
        language: "en",
        first_message:
          "Hi, I am Saarthi. I can help you use this website. What do you need help with?",
        prompt: {
          prompt:
            "You are Saarthi, a calm phone voice assistant for non-technical website users. Ask what the user needs help with. When they ask 'what is this?', 'what am I looking at?', or ask about the thing under their cursor, call the explain_current_element tool. After the tool returns, speak the explanation naturally and briefly. Do not mention screenshots, DOM, HTML, or internal tools.",
          llm: env("ELEVENLABS_AGENT_LLM", "gpt-4o-mini"),
          tool_ids: [tool.id],
          temperature: 0.35,
        },
      },
      ...(voiceId
        ? {
            tts: {
              voice_id: voiceId,
              model_id: "eleven_flash_v2_5",
              agent_output_audio_format: "pcm_16000",
            },
          }
        : {}),
    },
    platform_settings: {
      overrides: {
        conversation_config_override: {
          agent: {
            first_message: true,
            language: true,
            prompt: {
              prompt: true,
              llm: true,
              tool_ids: true,
            },
          },
          tts: {
            voice_id: true,
          },
        },
      },
    },
  });

  await upsertLocalEnv({
    ELEVENLABS_AGENT_ID: agent.agent_id,
    ELEVENLABS_EXPLAIN_TOOL_ID: tool.id,
  });

  console.log("Created Saarthi ElevenLabs resources");
  console.log(`Agent ID: ${agent.agent_id}`);
  console.log(`Tool ID: ${tool.id}`);
  console.log("Saved IDs to .env.local");
  console.log(
    "Set ELEVENLABS_AGENT_PHONE_NUMBER_ID in .env.local after importing or selecting a phone number.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
