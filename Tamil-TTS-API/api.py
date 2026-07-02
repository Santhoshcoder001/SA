from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models import AudioFormat, ErrorResponse, TTSRequest
from speech import TamilTTSEngine
from utils import AudioCache, make_cache_key, now_ms, wav_to_mp3

router = APIRouter()
engine = TamilTTSEngine()
cache = AudioCache(maxsize=512, ttl_seconds=3600)


@router.post(
    "/tts",
    responses={
        200: {
            "content": {
                "audio/wav": {},
                "audio/mpeg": {},
            },
            "description": "Synthesized speech audio",
        },
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
def text_to_speech(payload: TTSRequest) -> Response:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    request_started = now_ms()
    key = make_cache_key(text, payload.format.value)
    cached = cache.get(key)
    if cached is not None:
        media_type = "audio/wav" if payload.format == AudioFormat.WAV else "audio/mpeg"
        return Response(content=cached, media_type=media_type, headers={"X-Cache": "HIT"})

    try:
        wav_bytes = engine.synthesize_wav(text)
        if payload.format == AudioFormat.MP3:
            audio_bytes = wav_to_mp3(wav_bytes)
            media_type = "audio/mpeg"
        else:
            audio_bytes = wav_bytes
            media_type = "audio/wav"

        cache.set(key, audio_bytes)
        elapsed_ms = str(now_ms() - request_started)
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "X-Cache": "MISS",
                "X-Process-Time-Ms": elapsed_ms,
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}") from exc
