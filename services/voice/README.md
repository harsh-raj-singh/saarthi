# Saarthi Voice Worker

This FastAPI service keeps Saarthi's speech stack local and open source:

- `POST /asr` receives browser audio, converts it to 16 kHz mono WAV with `ffmpeg`, and transcribes with Parakeet on CPU.
- `POST /tts` receives text and returns a Piper WAV file.
- `GET /health` reports whether the worker is alive and which models are configured.

Run it as one long-lived process. Do not run multiple Uvicorn workers on a small CPU box because each worker loads its own ASR model.

```bash
python3.11 -m venv .venv-voice
source .venv-voice/bin/activate
python -m pip install --upgrade pip
pip install -r services/voice/requirements.txt
python scripts/download-piper-voice.py
uvicorn services.voice.app:app --host 0.0.0.0 --port 8010 --workers 1
```

Required system dependency:

```bash
brew install ffmpeg
```

Useful environment variables:

```bash
PARAKEET_MODEL=nvidia/parakeet-tdt-0.6b-v2
PIPER_BIN=piper
PIPER_MODEL_PATH=services/voice/models/en_US-lessac-medium.onnx
PIPER_CONFIG_PATH=services/voice/models/en_US-lessac-medium.onnx.json
VOICE_MAX_AUDIO_BYTES=15728640
VOICE_SUBPROCESS_TIMEOUT_SECONDS=45
VOICE_SERVICE_AUTH_TOKEN=
ASR_CONCURRENCY=1
SAARTHI_CPU_THREADS=4
CUDA_VISIBLE_DEVICES=""
TOKENIZERS_PARALLELISM=false
```
