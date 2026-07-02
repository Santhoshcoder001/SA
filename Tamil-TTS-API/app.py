import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import engine, router
from models import HealthResponse
from speech import MODEL_NAME
from utils import get_cors_origins

app = FastAPI(title="Tamil TTS API", version="1.0.0")

origins = get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    # Warm-load the model at startup to reduce first-request latency.
    engine.load()


@app.get("/healthz", response_model=HealthResponse)
def healthz() -> HealthResponse:
    return HealthResponse(status="ok", model=MODEL_NAME)


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse(
        {
            "name": "Tamil TTS API",
            "model": MODEL_NAME,
            "endpoints": ["GET /healthz", "POST /tts"],
            "docs": "/docs",
        }
    )


app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7860"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
