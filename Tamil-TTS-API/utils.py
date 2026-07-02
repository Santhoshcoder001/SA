import hashlib
import io
import os
import time
from threading import Lock
from typing import Any

from cachetools import TTLCache
from pydub import AudioSegment


class AudioCache:
    def __init__(self, maxsize: int = 256, ttl_seconds: int = 3600) -> None:
        self._cache: TTLCache[str, bytes] = TTLCache(maxsize=maxsize, ttl=ttl_seconds)
        self._lock = Lock()

    def get(self, key: str) -> bytes | None:
        with self._lock:
            return self._cache.get(key)

    def set(self, key: str, value: bytes) -> None:
        with self._lock:
            self._cache[key] = value


def make_cache_key(*parts: Any) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


def wav_to_mp3(wav_bytes: bytes, bitrate: str = "128k") -> bytes:
    wav_stream = io.BytesIO(wav_bytes)
    audio = AudioSegment.from_file(wav_stream, format="wav")

    mp3_stream = io.BytesIO()
    audio.export(mp3_stream, format="mp3", bitrate=bitrate)
    return mp3_stream.getvalue()


def now_ms() -> int:
    return int(time.time() * 1000)
