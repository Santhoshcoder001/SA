from enum import Enum

from pydantic import BaseModel, Field


class AudioFormat(str, Enum):
    WAV = "wav"
    MP3 = "mp3"


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Tamil text to synthesize")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="Output audio format")


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: str
    model: str
