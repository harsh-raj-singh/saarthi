FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES="" \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg curl build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY services/voice/requirements.txt /app/services/voice/requirements.txt
RUN pip install --no-cache-dir -r /app/services/voice/requirements.txt

COPY services /app/services

EXPOSE 8010
CMD ["uvicorn", "services.voice.app:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]
