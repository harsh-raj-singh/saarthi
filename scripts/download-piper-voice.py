#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path


DEFAULT_VOICE = "en_US-lessac-medium"
DEFAULT_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size > 0:
        print(f"exists {destination}")
        return

    print(f"download {url}")
    try:
        urllib.request.urlretrieve(url, destination)
    except Exception:
        destination.unlink(missing_ok=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Download the default Piper English voice for Saarthi.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Piper voice filename prefix.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Directory URL containing the voice files.")
    parser.add_argument(
        "--output-dir",
        default="services/voice/models",
        help="Directory where .onnx and .onnx.json files are stored.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir).expanduser().resolve()
    base_url = args.base_url.rstrip("/")
    model_path = output_dir / f"{args.voice}.onnx"
    config_path = output_dir / f"{args.voice}.onnx.json"

    download(f"{base_url}/{args.voice}.onnx", model_path)
    download(f"{base_url}/{args.voice}.onnx.json", config_path)

    print(f"ready {model_path}")
    print(f"ready {config_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
