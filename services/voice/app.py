from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask


APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PIPER_MODEL = APP_ROOT / "services" / "voice" / "models" / "en_US-lessac-medium.onnx"
DEFAULT_PIPER_CONFIG = APP_ROOT / "services" / "voice" / "models" / "en_US-lessac-medium.onnx.json"

PARAKEET_MODEL = os.getenv("PARAKEET_MODEL", "nvidia/parakeet-tdt-0.6b-v2")
PIPER_BIN = os.getenv("PIPER_BIN", "piper")
PIPER_MODEL_PATH = Path(os.getenv("PIPER_MODEL_PATH", str(DEFAULT_PIPER_MODEL))).expanduser()
PIPER_CONFIG_PATH = Path(os.getenv("PIPER_CONFIG_PATH", str(DEFAULT_PIPER_CONFIG))).expanduser()
MAX_AUDIO_BYTES = int(os.getenv("VOICE_MAX_AUDIO_BYTES", str(15 * 1024 * 1024)))
MAX_TTS_CHARS = int(os.getenv("VOICE_MAX_TTS_CHARS", "900"))
FFMPEG_BIN = os.getenv("FFMPEG_BIN", "ffmpeg")
PIPER_OUTPUT_FLAG = os.getenv("PIPER_OUTPUT_FLAG", "--output_file")
SUBPROCESS_TIMEOUT_SECONDS = int(os.getenv("VOICE_SUBPROCESS_TIMEOUT_SECONDS", "45"))
ASR_CONCURRENCY = int(os.getenv("ASR_CONCURRENCY", "1"))
CPU_THREADS = int(os.getenv("SAARTHI_CPU_THREADS", "0") or "0")
VOICE_SERVICE_AUTH_TOKEN = os.getenv("VOICE_SERVICE_AUTH_TOKEN", "").strip()
VOICE_PRELOAD_ASR = os.getenv("VOICE_PRELOAD_ASR", "true").strip().lower() not in {
    "0",
    "false",
    "no",
}

app = FastAPI(title="Saarthi Voice Worker", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_asr_model: Any | None = None
_asr_lock = asyncio.Lock()
_asr_semaphore = asyncio.Semaphore(max(1, ASR_CONCURRENCY))
_asr_state: dict[str, Any] = {
    "status": "not_loaded",
    "started_at": None,
    "loaded_at": None,
    "duration_ms": None,
    "error": None,
}


class TTSRequest(BaseModel):
    text: str


def _ms(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


@app.on_event("startup")
async def warm_asr_on_startup() -> None:
    if VOICE_PRELOAD_ASR:
        asyncio.create_task(_load_asr_model())


def _resolve_command(binary: str) -> str | None:
    resolved = shutil.which(binary)
    if resolved:
        return resolved

    venv_binary = Path(sys.executable).parent / binary
    if venv_binary.exists():
        return str(venv_binary)

    return None


def _check_command(binary: str, label: str) -> str:
    resolved = _resolve_command(binary)
    if resolved:
        return resolved
    raise HTTPException(
        status_code=503,
        detail=f"{label} is not installed or not on PATH: {binary}",
    )


def _require_auth(request: Request) -> None:
    if not VOICE_SERVICE_AUTH_TOKEN:
        return
    expected = f"Bearer {VOICE_SERVICE_AUTH_TOKEN}"
    if request.headers.get("authorization") != expected:
        raise HTTPException(status_code=401, detail="Voice worker auth failed.")


def _audio_suffix(filename: str | None, content_type: str | None) -> str:
    name = (filename or "").lower()
    if "." in name:
        suffix = "." + name.rsplit(".", 1)[-1]
        if suffix in {".wav", ".webm", ".mp3", ".m4a", ".mp4", ".ogg", ".flac"}:
            return suffix

    mime = (content_type or "").lower()
    if "wav" in mime:
        return ".wav"
    if "mpeg" in mime or "mp3" in mime:
        return ".mp3"
    if "mp4" in mime or "m4a" in mime:
        return ".m4a"
    if "ogg" in mime:
        return ".ogg"
    return ".webm"


def _load_asr_model_sync() -> Any:
    import torch
    import nemo.collections.asr as nemo_asr

    if CPU_THREADS > 0:
        torch.set_num_threads(CPU_THREADS)

    model = nemo_asr.models.ASRModel.from_pretrained(model_name=PARAKEET_MODEL)
    model.eval()
    model.to(torch.device("cpu"))
    return model


async def _load_asr_model() -> Any:
    global _asr_model
    if _asr_model is not None:
        return _asr_model

    async with _asr_lock:
        if _asr_model is not None:
            return _asr_model

        started = time.perf_counter()
        _asr_state.update(
            {
                "status": "loading",
                "started_at": time.time(),
                "loaded_at": None,
                "duration_ms": None,
                "error": None,
            }
        )
        try:
            _asr_model = await asyncio.to_thread(_load_asr_model_sync)
        except Exception as exc:  # pragma: no cover - depends on local model stack
            _asr_state.update({"status": "error", "error": str(exc)})
            raise HTTPException(
                status_code=503,
                detail=(
                    "Parakeet ASR dependencies are not installed. Install the voice worker "
                    "requirements and CPU PyTorch first."
                ),
            ) from exc

        _asr_state.update(
            {
                "status": "loaded",
                "loaded_at": time.time(),
                "duration_ms": _ms(started),
                "error": None,
            }
        )
        return _asr_model


def _extract_transcript(result: Any) -> str:
    item = result[0] if isinstance(result, list) and result else result
    if item is None:
        return ""
    if isinstance(item, str):
        return item.strip()
    text = getattr(item, "text", None)
    if isinstance(text, str):
        return text.strip()
    if isinstance(item, dict):
        value = item.get("text") or item.get("transcript")
        if isinstance(value, str):
            return value.strip()
    return str(item).strip()


async def _run_ffmpeg(input_path: Path, wav_path: Path) -> None:
    ffmpeg_bin = _check_command(FFMPEG_BIN, "ffmpeg")
    command = [
        ffmpeg_bin,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_path),
        "-ac",
        "1",
        "-ar",
        "16000",
        "-vn",
        str(wav_path),
    ]
    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            command,
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=408, detail="Audio decoding timed out.") from exc
    if proc.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail=f"Could not decode audio: {proc.stderr.strip() or 'ffmpeg failed'}",
        )


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "saarthi-voice",
        "asr": {
            "model": PARAKEET_MODEL,
            "loaded": _asr_model is not None,
            "device": "cpu",
            **_asr_state,
        },
        "tts": {
            "engine": "piper",
            "binary": _resolve_command(PIPER_BIN),
            "model": str(PIPER_MODEL_PATH),
            "model_exists": PIPER_MODEL_PATH.exists(),
            "config_exists": PIPER_CONFIG_PATH.exists(),
        },
    }


@app.post("/asr")
async def asr(request: Request, audio: UploadFile = File(...)) -> dict[str, Any]:
    _require_auth(request)
    started = time.perf_counter()
    contents = await audio.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Missing audio data.")
    if len(contents) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio recording is too large.")

    suffix = _audio_suffix(audio.filename, audio.content_type)
    with tempfile.TemporaryDirectory(prefix="saarthi-asr-") as temp_dir:
        input_path = Path(temp_dir) / f"input{suffix}"
        wav_path = Path(temp_dir) / "speech.wav"
        input_path.write_bytes(contents)
        await _run_ffmpeg(input_path, wav_path)

        model = await _load_asr_model()
        async with _asr_semaphore:
            result = await asyncio.to_thread(model.transcribe, [str(wav_path)])
        text = _extract_transcript(result)

    return {
        "text": text,
        "model": PARAKEET_MODEL,
        "duration_ms": _ms(started),
    }


@app.post("/tts")
async def tts(request: Request, payload: TTSRequest) -> FileResponse:
    _require_auth(request)
    started = time.perf_counter()
    text = " ".join(payload.text.split()).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text.")
    if len(text) > MAX_TTS_CHARS:
        text = text[:MAX_TTS_CHARS].rsplit(" ", 1)[0] or text[:MAX_TTS_CHARS]

    piper_bin = _check_command(PIPER_BIN, "Piper")
    if not PIPER_MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Piper model is missing: {PIPER_MODEL_PATH}",
        )

    temp = tempfile.NamedTemporaryFile(prefix="saarthi-tts-", suffix=".wav", delete=False)
    output_path = Path(temp.name)
    temp.close()

    command = [
        piper_bin,
        "--model",
        str(PIPER_MODEL_PATH),
        PIPER_OUTPUT_FLAG,
        str(output_path),
    ]
    if PIPER_CONFIG_PATH.exists():
        command.extend(["--config", str(PIPER_CONFIG_PATH)])

    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            command,
            input=text,
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=408, detail="Piper timed out.") from exc

    if proc.returncode != 0 and PIPER_OUTPUT_FLAG == "--output_file":
        retry_command = command.copy()
        retry_command[retry_command.index("--output_file")] = "--output-file"
        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                retry_command,
                input=text,
                capture_output=True,
                text=True,
                timeout=SUBPROCESS_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            output_path.unlink(missing_ok=True)
            raise HTTPException(status_code=408, detail="Piper timed out.") from exc
    if proc.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        output_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=503,
            detail=f"Piper failed: {proc.stderr.strip() or 'no audio produced'}",
        )

    headers = {
        "x-saarthi-duration-ms": str(_ms(started)),
        "x-saarthi-model": PIPER_MODEL_PATH.stem,
    }
    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename="saarthi-reply.wav",
        headers=headers,
        background=BackgroundTask(output_path.unlink, missing_ok=True),
    )
