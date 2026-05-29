# Saarthi

Saarthi is an embeddable voice assistant for non-technical users who get stuck on websites. Add one script tag, and users can press a floating mic, ask what something means, and hear a simple spoken answer without leaving the page.

This version uses OpenAI for the whole voice loop:

- Speech to text: `gpt-4o-mini-transcribe`
- Website guidance: `gpt-4o-mini` by default
- Text to speech: `gpt-4o-mini-tts`
- Languages: English, Hindi, and natural Hinglish
- Calls: none
- Twilio, ElevenLabs, Parakeet, Piper: not used

## How It Works

1. A website embeds `public/widget.js`.
2. The widget tracks the cursor and visible page controls locally.
3. The user presses the mic and asks a short question in English, Hindi, or Hinglish.
4. The website backend receives browser audio and safe page context at `POST /api/voice/turn`.
5. The backend sends audio to OpenAI transcription.
6. The backend asks OpenAI for a plain-language explanation or verbal next step.
7. The backend sends the answer to OpenAI text-to-speech.
8. The widget plays the returned audio in the browser.

## What Do I Pay For?

You do not need Twilio, ElevenLabs, or any CPU speech host for this build.

You pay for OpenAI API usage:

- transcription tokens/audio
- `gpt-4o-mini` response generation by default
- TTS audio output

Because speech now runs through OpenAI, Vercel can host the whole website/backend flow as long as the required OpenAI environment variables are set.

## Embed

Add this before `</body>`:

```html
<script
  src="https://your-domain.com/widget.js"
  data-site-id="your_site_id"
  data-theme="auto"
  async
></script>
```

Optional brand configuration:

```html
<script>
  window.SaarthiConfig = {
    color: "#6366f1",
    theme: "auto",
    lang: ["hi", "en"],
    position: "bottom-right",
    greeting: "Need help with this page?"
  };
</script>
```

The same values can be passed as script attributes: `data-color`, `data-theme`, `data-lang`, `data-position`, and `data-greeting`.

For local testing, open `/embed-test`:

```html
<script src="/widget.js" data-site-id="demo" async></script>
```

## Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Minimum values:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
OPENAI_TTS_FORMAT=mp3
SAARTHI_ALLOWED_ORIGINS=https://your-domain.com
```

The app can also read an OpenAI key from:

```bash
OPENAI_API_KEY_FILE=/Users/you/Desktop/files/orange/openai_api_key.txt
```

For local development, `SAARTHI_ALLOWED_ORIGINS` can be empty.

## Local Development

Install and run:

```bash
npm install
npm run dev
```

Open:

- website: `http://localhost:3000`
- embed demo: `http://localhost:3000/embed-test`
- health check: `http://localhost:3000/api/health`

## Deployment

Recommended Vercel environment:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
OPENAI_TTS_FORMAT=mp3
SAARTHI_ALLOWED_ORIGINS=https://your-domain.com
```

No worker URL is needed anymore.

## API Routes

- `POST /api/voice/turn`: accepts `multipart/form-data` with `audio` and `context`; returns transcript, reply text, and spoken audio as base64.
- `GET /api/health`: confirms the Next.js app is alive.

## Privacy

Saarthi does not continuously stream the screen. It records only after the user presses the mic. The widget sends cursor position, the element under the cursor, and nearby visible controls. It strips URL query strings, avoids form values by default, and skips page regions marked with:

```html
data-saarthi-private
```

Before public production, add site allowlists, signed embed keys, and rate limits so unknown sites cannot use your OpenAI budget.

## License

MIT
