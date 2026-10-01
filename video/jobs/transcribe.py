"""Transcribes one audio file with faster-whisper and prints JSON with word timings.

    python transcribe.py <audio.wav>

Called by prep.mjs. WHISPER_MODEL (default "small") and WHISPER_DEVICE ("cpu" or
"cuda", default "cpu") override the defaults; CUDA on Windows needs the cuBLAS and
cuDNN DLLs on PATH, which is why CPU is the default.
"""

import json
import os
import sys

from faster_whisper import WhisperModel


def main():
    path = sys.argv[1]
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    model = WhisperModel(
        os.environ.get("WHISPER_MODEL", "small"),
        device=device,
        compute_type="int8" if device == "cpu" else "float16",
    )
    segments, info = model.transcribe(path, word_timestamps=True, vad_filter=True)
    out = {
        "language": info.language,
        "segments": [
            {
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "text": s.text.strip(),
                "words": [
                    {"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()}
                    for w in (s.words or [])
                ],
            }
            for s in segments
        ],
    }
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
