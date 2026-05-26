# Saarthi

Saarthi is an embeddable voice assistant for non-technical users who get stuck on websites. Add one script tag, and users can press a floating mic, ask what something means, and hear a simple spoken answer without leaving the page.

This version is open-source speech first:

- ASR: Parakeet on a CPU voice worker
- TTS: Piper on the same CPU voice worker
- LLM: OpenAI, default `OPENAI_MODEL=gpt-5.5-mini`
- Calls: none
- Twilio/ElevenLabs: not used

## How It Works

1. A website embeds `public/widget.js`.
2. The widget tracks the cursor and visible page controls locally.
3. The user presses the mic and asks a short question.
4. The website backend receives browser audio and safe page context at `POST /api/voice/turn`.
5. The backend sends audio to the voice worker `POST /asr`.
6. The backend asks OpenAI for a plain-language explanation or verbal next step.
7. The backend sends the answer to the voice worker `POST /tts`.
8. The widget plays the returned WAV audio in the browser.

## What Do I Pay For?

You do not need Twilio, ElevenLabs, or a phone provider for this build.

You still pay for:

- OpenAI API usage.
- CPU hosting if the voice worker is not running on your own machine.

Vercel can host the Next.js website and API gateway, but it is not the right place for Parakeet and Piper model loading. Run the voice worker as a long-lived process on a VM, container host, or local machine, then set `VOICE_SERVICE_URL`.

## Embed

Add this before `</body>`:

```html
<script
  src="https://your-domain.com/widget.js"
  data-site-id="your_site_id"
  async
></script>
```

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
OPENAI_MODEL=gpt-5.5-mini
SAARTHI_ALLOWED_ORIGINS=https://your-domain.com
VOICE_SERVICE_URL=http://127.0.0.1:8010
VOICE_SERVICE_AUTH_TOKEN=
```

The app can also read an OpenAI key from:

```bash
OPENAI_API_KEY_FILE=/Users/you/Desktop/files/orange/openai_api_key.txt
```

## Local Development

Install the website dependencies:

```bash
npm install
```

Install the voice worker dependencies:

```bash
python3.11 -m venv .venv-voice
source .venv-voice/bin/activate
python -m pip install --upgrade pip
pip install -r services/voice/requirements.txt
```

Install `ffmpeg`:

```bash
brew install ffmpeg
```

Download the default Piper English voice:

```bash
python scripts/download-piper-voice.py
```

Start the voice worker:

```bash
npm run voice:dev
```

Start the website in another terminal:

```bash
npm run dev
```

Open:

- website: `http://localhost:3000`
- embed demo: `http://localhost:3000/embed-test`
- web health: `http://localhost:3000/api/health`
- voice worker health: `http://localhost:8010/health`

If the widget says the voice worker is not reachable, `http://localhost:8010/health` is the first thing to check. The Next.js app can be healthy while speech still fails if this worker is not running.

## Docker Compose

For one-box development:

```bash
cp .env.example .env.local
python scripts/download-piper-voice.py
docker compose up --build
```

The first Parakeet model load can take time and needs several GB of RAM.

## Deployment

Recommended production shape:

- Vercel: Next.js site, `/widget.js`, and `/api/voice/turn`.
- CPU worker: FastAPI service running Parakeet, Piper, and `ffmpeg`.
- Env on Vercel: `OPENAI_API_KEY`, `OPENAI_MODEL`, `VOICE_SERVICE_URL`, and `VOICE_SERVICE_AUTH_TOKEN` if the worker is remote.

If the worker is on the same VPS as the website backend, bind it to `127.0.0.1`. If it is remote from Vercel, expose it behind HTTPS and set the same `VOICE_SERVICE_AUTH_TOKEN` on Vercel and the worker.

## API Routes

- `POST /api/voice/turn`: accepts `multipart/form-data` with `audio` and `context`; returns transcript, reply text, and WAV audio as base64.
- `GET /api/health`: confirms the Next.js app is alive.
- `GET /health` on the voice worker: reports ASR/TTS configuration.
- `POST /asr` on the voice worker: browser audio in, transcript out.
- `POST /tts` on the voice worker: text in, `audio/wav` out.

## Privacy

Saarthi does not continuously stream the screen. It records only after the user presses the mic. The widget sends cursor position, the element under the cursor, and nearby visible controls. It strips URL query strings, avoids form values by default, and skips page regions marked with:

```html
data-saarthi-private
```

Before public production, add site allowlists, signed embed keys, rate limits, and worker authentication so unknown sites cannot use your OpenAI or CPU budget.

## License

MIT
