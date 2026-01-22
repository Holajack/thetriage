"""
Video Transcription Script using OpenAI Whisper API.

Extracts audio from video files and transcribes using Whisper.
Handles large files by chunking audio into segments.

Usage:
    python execution/transcribe_video.py --video ./path/to/video.mp4
    python execution/transcribe_video.py --video "https://youtube.com/watch?v=..."
"""

import argparse
import subprocess
import tempfile
import os
import re
from pathlib import Path
from typing import List, Optional
import math

from openai import OpenAI

from utils import (
    load_env,
    log,
    save_json,
    get_tmp_path,
    timestamp,
    ExecutionResult,
    TMP_DIR
)

# Whisper API file size limit (25MB)
MAX_FILE_SIZE = 25 * 1024 * 1024
# Chunk duration in seconds (10 minutes)
CHUNK_DURATION = 600


def check_ffmpeg() -> bool:
    """Check if ffmpeg is installed."""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def check_ytdlp() -> bool:
    """Check if yt-dlp is installed."""
    try:
        subprocess.run(
            ["yt-dlp", "--version"],
            capture_output=True,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def is_youtube_url(path: str) -> bool:
    """Check if the path is a YouTube URL."""
    youtube_patterns = [
        r'(https?://)?(www\.)?youtube\.com/watch\?v=',
        r'(https?://)?(www\.)?youtu\.be/',
        r'(https?://)?(www\.)?youtube\.com/shorts/',
    ]
    return any(re.match(pattern, path) for pattern in youtube_patterns)


def download_youtube_audio(url: str, output_dir: Path) -> Path:
    """Download audio from YouTube video using yt-dlp."""
    if not check_ytdlp():
        raise RuntimeError(
            "yt-dlp not found. Install with: pip install yt-dlp"
        )

    output_path = output_dir / "youtube_audio.mp3"

    log(f"Downloading audio from YouTube: {url}")

    result = subprocess.run(
        [
            "yt-dlp",
            "-x",  # Extract audio
            "--audio-format", "mp3",
            "--audio-quality", "0",  # Best quality
            "-o", str(output_path),
            url
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr}")

    # yt-dlp might add extension, find the actual file
    for f in output_dir.glob("youtube_audio*"):
        return f

    raise RuntimeError("Downloaded audio file not found")


def extract_audio(video_path: Path, output_path: Path) -> Path:
    """Extract audio from video file using ffmpeg."""
    if not check_ffmpeg():
        raise RuntimeError(
            "ffmpeg not found. Install with: brew install ffmpeg"
        )

    log(f"Extracting audio from {video_path}")

    result = subprocess.run(
        [
            "ffmpeg",
            "-i", str(video_path),
            "-vn",  # No video
            "-acodec", "libmp3lame",
            "-ar", "16000",  # 16kHz sample rate (good for speech)
            "-ac", "1",  # Mono
            "-y",  # Overwrite
            str(output_path)
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")

    return output_path


def get_audio_duration(audio_path: Path) -> float:
    """Get duration of audio file in seconds."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path)
        ],
        capture_output=True,
        text=True
    )

    return float(result.stdout.strip())


def chunk_audio(audio_path: Path, output_dir: Path) -> List[Path]:
    """Split audio file into chunks for API upload."""
    duration = get_audio_duration(audio_path)
    num_chunks = math.ceil(duration / CHUNK_DURATION)

    if num_chunks == 1:
        return [audio_path]

    log(f"Splitting audio into {num_chunks} chunks")

    chunks = []
    for i in range(num_chunks):
        start_time = i * CHUNK_DURATION
        chunk_path = output_dir / f"chunk_{i:03d}.mp3"

        subprocess.run(
            [
                "ffmpeg",
                "-i", str(audio_path),
                "-ss", str(start_time),
                "-t", str(CHUNK_DURATION),
                "-acodec", "libmp3lame",
                "-y",
                str(chunk_path)
            ],
            capture_output=True,
            check=True
        )

        chunks.append(chunk_path)

    return chunks


def transcribe_audio(
    client: OpenAI,
    audio_path: Path,
    chunk_index: int = 0,
    total_chunks: int = 1
) -> dict:
    """Transcribe a single audio file using Whisper API."""
    log(f"Transcribing chunk {chunk_index + 1}/{total_chunks}: {audio_path.name}")

    with open(audio_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )

    return response


def merge_transcripts(transcripts: List[dict], chunk_duration: int = CHUNK_DURATION) -> dict:
    """Merge multiple transcript chunks into one."""
    merged = {
        "text": "",
        "segments": [],
        "language": transcripts[0].language if transcripts else "en",
        "duration": 0
    }

    for i, transcript in enumerate(transcripts):
        offset = i * chunk_duration

        # Add text with newline separator
        if merged["text"]:
            merged["text"] += "\n\n"
        merged["text"] += transcript.text

        # Adjust segment timestamps
        if hasattr(transcript, 'segments') and transcript.segments:
            for segment in transcript.segments:
                adjusted_segment = {
                    "start": segment.get("start", 0) + offset,
                    "end": segment.get("end", 0) + offset,
                    "text": segment.get("text", "")
                }
                merged["segments"].append(adjusted_segment)

        # Update total duration
        if hasattr(transcript, 'duration'):
            merged["duration"] += transcript.duration

    return merged


def transcribe_video(
    video_path: str,
    openai_api_key: str
) -> ExecutionResult:
    """
    Main transcription function.

    Args:
        video_path: Path to video file or YouTube URL
        openai_api_key: OpenAI API key

    Returns:
        ExecutionResult with transcript data
    """
    client = OpenAI(api_key=openai_api_key)

    # Create temp directories
    audio_dir = get_tmp_path("audio")
    audio_dir.mkdir(exist_ok=True)

    # Determine video name for output
    if is_youtube_url(video_path):
        video_name = "youtube_video"
        log(f"Processing YouTube URL: {video_path}")
        audio_path = download_youtube_audio(video_path, audio_dir)
    else:
        video_file = Path(video_path)
        if not video_file.exists():
            return ExecutionResult.fail(f"Video file not found: {video_path}")

        video_name = video_file.stem
        audio_path = audio_dir / f"{video_name}.mp3"
        extract_audio(video_file, audio_path)

    # Check file size and chunk if needed
    file_size = audio_path.stat().st_size
    log(f"Audio file size: {file_size / (1024*1024):.2f} MB")

    if file_size > MAX_FILE_SIZE:
        log("File exceeds 25MB limit, chunking...")
        audio_chunks = chunk_audio(audio_path, audio_dir)
    else:
        audio_chunks = [audio_path]

    # Transcribe all chunks
    transcripts = []
    for i, chunk_path in enumerate(audio_chunks):
        transcript = transcribe_audio(
            client,
            chunk_path,
            chunk_index=i,
            total_chunks=len(audio_chunks)
        )
        transcripts.append(transcript)

    # Merge if multiple chunks
    if len(transcripts) > 1:
        final_transcript = merge_transcripts(transcripts)
    else:
        t = transcripts[0]
        final_transcript = {
            "text": t.text,
            "segments": [
                {"start": s.get("start", 0), "end": s.get("end", 0), "text": s.get("text", "")}
                for s in (t.segments if hasattr(t, 'segments') and t.segments else [])
            ],
            "language": t.language if hasattr(t, 'language') else "en",
            "duration": t.duration if hasattr(t, 'duration') else 0
        }

    # Add metadata
    final_transcript["source"] = video_path
    final_transcript["video_name"] = video_name
    final_transcript["chunks_processed"] = len(audio_chunks)

    # Save transcript
    output_filename = f"transcripts/{video_name}_{timestamp()}.json"
    output_path = save_json(final_transcript, output_filename)

    log(f"Transcript saved to {output_path}")

    return ExecutionResult.ok(
        data=final_transcript,
        output_path=str(output_path),
        video_name=video_name,
        duration_seconds=final_transcript.get("duration", 0),
        word_count=len(final_transcript["text"].split())
    )


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe video using OpenAI Whisper API"
    )
    parser.add_argument(
        "--video",
        required=True,
        help="Path to video file or YouTube URL"
    )

    args = parser.parse_args()

    # Load environment
    env = load_env()
    api_key = env.get("OPENAI_API_KEY")

    if not api_key:
        result = ExecutionResult.fail(
            "OPENAI_API_KEY not found in environment. "
            "Add it to your .env file."
        )
        print(result.to_json())
        return

    try:
        result = transcribe_video(args.video, api_key)
    except Exception as e:
        log(f"Transcription failed: {e}", level="error")
        result = ExecutionResult.fail(str(e))

    print(result.to_json())


if __name__ == "__main__":
    main()
