# Saarthi

Saarthi is a voice assistant for non-technical users who get stuck on websites. Drop in one script tag, let a user enter their phone number, and Saarthi calls them back through ElevenLabs. During the call, the user can hover over any part of the page and ask, "What is this?" Saarthi captures page context, asks OpenAI vision for a simple explanation, and speaks it back in the same ElevenLabs conversation.

## How It Works

1. A website embeds `widget.js`.
2. The widget opens a small floating Saarthi button.
3. The user enters their phone number.
4. The server starts an ElevenLabs outbound callback.
5. The ElevenLabs agent greets the user and asks what they need help with.
6. When the user asks "what is this?", the ElevenLabs webhook tool calls Saarthi.
7. Saarthi asks the browser widget for fresh context.
8. The widget captures a full viewport screenshot, a 400px crop around the cursor, a 100px tight crop, and DOM metadata.
9. The server sends that context to OpenAI vision and returns a plain explanation to ElevenLabs.

## Embed

Add this before `</body>`:

```html
<script
  src="https://your-domain.com/widget.js"
  data-site-id="your_site_id"
  async
></script>
```

For local testing, open `/embed-test`. It embeds the widget exactly like a customer website would:

```html
<script src="/widget.js" data-site-id="demo" data-demo="true" async></script>
```

## Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Required values:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_AGENT_PHONE_NUMBER_ID=
OPENAI_API_KEY=
SAARTHI_PUBLIC_URL=https://your-domain.com
```

Optional values:

```bash
ELEVENLABS_VOICE_ID=
OPENAI_API_KEY_FILE=/Users/you/Desktop/files/orange/openai_api_key.txt
OPENAI_VISION_MODEL=gpt-4o
SAARTHI_FIRST_MESSAGE="Hi, I am Saarthi. I can help you use this website. What do you need help with?"
```

Secrets are server-only. Do not expose ElevenLabs or OpenAI keys in the script tag.

## ElevenLabs Setup

Saarthi expects an ElevenLabs phone agent with a webhook tool.

You can create the agent and tool through the API:

```bash
SAARTHI_PUBLIC_URL=https://your-domain.com npm run provision:elevenlabs
```

The script creates:

- an ElevenLabs webhook tool named `explain_current_element`
- an ElevenLabs agent named `Saarthi`
- local `.env.local` entries for `ELEVENLABS_AGENT_ID` and `ELEVENLABS_EXPLAIN_TOOL_ID`

You still need to set `ELEVENLABS_AGENT_PHONE_NUMBER_ID` after importing or selecting a Twilio phone number in ElevenLabs.

The live tool URL is:

```txt
POST /api/elevenlabs/explain
```

The tool should pass `saarthi_session_id` from conversation dynamic variables. The outbound call route sends that dynamic variable when the user requests a callback.

## Development

```bash
npm install
npm run dev
```

Open:

- website: `http://localhost:3000`
- embed demo: `http://localhost:3000/embed-test`
- health check: `http://localhost:3000/api/health`

## API Routes

- `POST /api/call` starts the ElevenLabs callback.
- `POST /api/elevenlabs/explain` handles the live ElevenLabs webhook tool.
- `GET /api/sessions/:sessionId/actions` lets the widget poll for capture requests.
- `POST /api/sessions/:sessionId/context` sends screenshot and DOM context back to the server.
- `GET /api/sessions/:sessionId/status` exposes demo/debug session state.

## Privacy

Saarthi does not continuously stream the screen. It tracks the cursor locally and captures screenshots only when the caller asks for help during a live session. The widget redacts obvious sensitive fields and ignores regions marked with `data-saarthi-private`.

For production, replace the in-memory session store with Redis, add per-site origin allowlists, rate-limit phone submissions, and verify any sensitive webhook paths with a secret header.

## License

MIT
