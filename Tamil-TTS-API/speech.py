from threading import Lock

import numpy as np
import soundfile as sf
import torch
from transformers import AutoTokenizer, VitsModel

MODEL_NAME = "facebook/mms-tts-tam"


class TamilTTSEngine:
    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model_name = model_name
        self._model: VitsModel | None = None
        self._tokenizer: AutoTokenizer | None = None
        self._lock = Lock()

    @property
    def ready(self) -> bool:
        return self._model is not None and self._tokenizer is not None

    def load(self) -> None:
        if self.ready:
            return

        with self._lock:
            if self.ready:
                return
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = VitsModel.from_pretrained(self.model_name)
            self._model.eval()

    def synthesize_wav(self, text: str) -> bytes:
        if not self.ready:
            self.load()

        assert self._model is not None
        assert self._tokenizer is not None

        inputs = self._tokenizer(text, return_tensors="pt")

        if "input_ids" not in inputs:
            keys = ", ".join(sorted(inputs.keys()))
            raise RuntimeError(f"Tokenizer output is missing input_ids. Got keys: {keys}")

        # VITS expects integer token ids for embeddings.
        if inputs["input_ids"].dtype not in (torch.int32, torch.int64):
            inputs["input_ids"] = inputs["input_ids"].long()

        # Keep optional mask tensor aligned as integer type when present.
        if "attention_mask" in inputs and inputs["attention_mask"].dtype not in (torch.int32, torch.int64):
            inputs["attention_mask"] = inputs["attention_mask"].long()

        with torch.inference_mode():
            output = self._model(**inputs).waveform

        waveform = output.squeeze().cpu().numpy().astype(np.float32)
        sample_rate = int(getattr(self._model.config, "sampling_rate", 16000))

        # Write bytes in-memory to avoid disk I/O in containerized runtime.
        wav_buffer = self._to_wav_bytes(waveform, sample_rate)
        return wav_buffer

    @staticmethod
    def _to_wav_bytes(waveform: np.ndarray, sample_rate: int) -> bytes:
        from io import BytesIO

        buffer = BytesIO()
        sf.write(buffer, waveform, sample_rate, format="WAV")
        return buffer.getvalue()
