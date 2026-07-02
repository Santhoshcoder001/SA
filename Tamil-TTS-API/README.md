---
title: Tamil TTS API
sdk: docker
app_port: 7860
---

# Tamil Text-to-Speech API (Hugging Face Space)

Production-ready FastAPI service for Tamil TTS powered by `facebook/mms-tts-tam`.

## Features

- FastAPI API with OpenAPI docs
- Tamil model: `facebook/mms-tts-tam`
- Output formats: WAV and MP3
- CORS support for browser clients (for example, Vercel-hosted apps)
- In-memory TTL caching
- Health endpoint and structured errors

## Endpoints

- `GET /` basic service info
- `GET /healthz` health check
- `POST /tts` synthesize speech

### `POST /tts` request

```json
{
  "text": "vanakkam",
  "format": "wav"
}
```

- `text`: Tamil text to synthesize (required)
- `format`: `wav` or `mp3` (optional, default: `wav`)

### cURL example

```bash
curl -X POST "https://YOURSPACE.hf.space/tts" \
  -H "Content-Type: application/json" \
  -d '{"text":"வணக்கம்","format":"wav"}' \
  --output tamil.wav
```

## Environment variables

- `CORS_ORIGINS` comma-separated origins, example:
  - `https://your-app.vercel.app,https://www.yourdomain.com`
  - Default: `*`

## Local run

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860
```

Open docs at `http://localhost:7860/docs`.

## Hugging Face Space setup

1. Create a new Space
2. Select `Docker`
3. Upload all files in this folder
4. (Optional) set `CORS_ORIGINS` in Space Variables
5. Wait for build, then call `POST /tts`
