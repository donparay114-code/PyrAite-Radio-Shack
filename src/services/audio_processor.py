"""Audio processing service using FFmpeg."""

import asyncio
import json
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AudioMetadata:
    """Metadata extracted from audio file."""

    duration_seconds: float
    sample_rate: int
    channels: int
    bitrate: int
    codec: str
    format: str
    lufs_integrated: Optional[float] = None
    lufs_range: Optional[float] = None
    peak_db: Optional[float] = None


@dataclass
class ProcessingResult:
    """Result of audio processing operation."""

    success: bool
    output_path: Optional[Path] = None
    error_message: Optional[str] = None
    metadata: Optional[AudioMetadata] = None


class AudioProcessor:
    """FFmpeg-based audio processor for radio station."""

    # Target loudness for broadcast (EBU R128)
    TARGET_LUFS = -14.0
    TARGET_TRUE_PEAK = -1.0

    # Supported formats
    SUPPORTED_FORMATS = {"mp3", "wav", "flac", "ogg", "m4a", "aac"}

    def __init__(self, ffmpeg_path: str = "ffmpeg", ffprobe_path: str = "ffprobe"):
        self.ffmpeg = ffmpeg_path
        self.ffprobe = ffprobe_path

    async def _run_command(self, cmd: list[str]) -> tuple[int, str, str]:
        """Run a command asynchronously."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        return process.returncode, stdout.decode(), stderr.decode()

    def _run_command_sync(self, cmd: list[str]) -> tuple[int, str, str]:
        """Run a command synchronously."""
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr

    async def get_metadata(self, input_path: Path) -> Optional[AudioMetadata]:
        """
        Extract metadata from audio file.

        Args:
            input_path: Path to audio file

        Returns:
            AudioMetadata or None if extraction fails
        """
        if not input_path.exists():
            logger.error(f"File not found: {input_path}")
            return None

        cmd = [
            self.ffprobe,
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(input_path),
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            logger.error(f"ffprobe failed: {stderr}")
            return None

        try:
            data = json.loads(stdout)
            format_info = data.get("format", {})
            streams = data.get("streams", [])

            # Find audio stream
            audio_stream = next(
                (s for s in streams if s.get("codec_type") == "audio"),
                {},
            )

            return AudioMetadata(
                duration_seconds=float(format_info.get("duration", 0)),
                sample_rate=int(audio_stream.get("sample_rate", 44100)),
                channels=int(audio_stream.get("channels", 2)),
                bitrate=int(format_info.get("bit_rate", 0)),
                codec=audio_stream.get("codec_name", "unknown"),
                format=format_info.get("format_name", "unknown"),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse ffprobe output: {e}")
            return None

    async def analyze_loudness(self, input_path: Path) -> Optional[dict]:
        """
        Analyze audio loudness using EBU R128.

        Args:
            input_path: Path to audio file

        Returns:
            Dict with LUFS measurements or None
        """
        cmd = [
            self.ffmpeg,
            "-i",
            str(input_path),
            "-af",
            "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
            "-f",
            "null",
            "-",
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        # loudnorm outputs to stderr
        try:
            # Find JSON in stderr
            json_start = stderr.rfind("{")
            json_end = stderr.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = stderr[json_start:json_end]
                return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass

        return None

    async def normalize(
        self,
        input_path: Path,
        output_path: Optional[Path] = None,
        target_lufs: float = TARGET_LUFS,
        target_tp: float = TARGET_TRUE_PEAK,
    ) -> ProcessingResult:
        """
        Normalize audio to target loudness (EBU R128).

        Args:
            input_path: Path to input audio file
            output_path: Path for output file (auto-generated if None)
            target_lufs: Target integrated loudness in LUFS
            target_tp: Target true peak in dB

        Returns:
            ProcessingResult with normalized audio path
        """
        if not input_path.exists():
            return ProcessingResult(
                success=False,
                error_message=f"Input file not found: {input_path}",
            )

        if output_path is None:
            output_path = input_path.parent / f"{input_path.stem}_normalized.mp3"

        # First pass: analyze
        loudness = await self.analyze_loudness(input_path)
        if not loudness:
            return ProcessingResult(
                success=False,
                error_message="Failed to analyze audio loudness",
            )

        # Second pass: normalize with measured values
        cmd = [
            self.ffmpeg,
            "-y",
            "-i",
            str(input_path),
            "-af",
            (
                f"loudnorm=I={target_lufs}:TP={target_tp}:LRA=11:"
                f"measured_I={loudness.get('input_i', -24)}:"
                f"measured_TP={loudness.get('input_tp', -1)}:"
                f"measured_LRA={loudness.get('input_lra', 7)}:"
                f"measured_thresh={loudness.get('input_thresh', -34)}:"
                f"offset={loudness.get('target_offset', 0)}:"
                "linear=true:print_format=summary"
            ),
            "-ar",
            "44100",
            "-ab",
            "320k",
            str(output_path),
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            return ProcessingResult(
                success=False,
                error_message=f"FFmpeg normalization failed: {stderr}",
            )

        metadata = await self.get_metadata(output_path)

        return ProcessingResult(
            success=True,
            output_path=output_path,
            metadata=metadata,
        )

    async def convert_format(
        self,
        input_path: Path,
        output_path: Path,
        bitrate: str = "320k",
        sample_rate: int = 44100,
    ) -> ProcessingResult:
        """
        Convert audio to different format.

        Args:
            input_path: Path to input audio file
            output_path: Path for output file
            bitrate: Target bitrate (e.g., "320k", "256k")
            sample_rate: Target sample rate

        Returns:
            ProcessingResult
        """
        if not input_path.exists():
            return ProcessingResult(
                success=False,
                error_message=f"Input file not found: {input_path}",
            )

        cmd = [
            self.ffmpeg,
            "-y",
            "-i",
            str(input_path),
            "-ar",
            str(sample_rate),
            "-ab",
            bitrate,
            str(output_path),
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            return ProcessingResult(
                success=False,
                error_message=f"FFmpeg conversion failed: {stderr}",
            )

        metadata = await self.get_metadata(output_path)

        return ProcessingResult(
            success=True,
            output_path=output_path,
            metadata=metadata,
        )

    async def add_crossfade(
        self,
        input_paths: list[Path],
        output_path: Path,
        fade_duration: float = 3.0,
    ) -> ProcessingResult:
        """
        Concatenate audio files with crossfade.

        Args:
            input_paths: List of input audio files
            output_path: Path for output file
            fade_duration: Crossfade duration in seconds

        Returns:
            ProcessingResult
        """
        if len(input_paths) < 2:
            return ProcessingResult(
                success=False,
                error_message="Need at least 2 files for crossfade",
            )

        for path in input_paths:
            if not path.exists():
                return ProcessingResult(
                    success=False,
                    error_message=f"Input file not found: {path}",
                )

        # Build complex filter for crossfade
        inputs = []
        filter_complex = []

        for i, path in enumerate(input_paths):
            inputs.extend(["-i", str(path)])

        # Create crossfade chain
        prev_label = "[0:a]"
        for i in range(1, len(input_paths)):
            curr_label = f"[{i}:a]"
            out_label = f"[a{i}]" if i < len(input_paths) - 1 else "[out]"
            filter_complex.append(
                f"{prev_label}{curr_label}acrossfade=d={fade_duration}:c1=tri:c2=tri{out_label}"
            )
            prev_label = out_label

        cmd = [
            self.ffmpeg,
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(filter_complex),
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ab",
            "320k",
            str(output_path),
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            return ProcessingResult(
                success=False,
                error_message=f"FFmpeg crossfade failed: {stderr}",
            )

        return ProcessingResult(
            success=True,
            output_path=output_path,
        )

    async def create_dj_intro(
        self,
        speech_path: Path,
        music_path: Path,
        output_path: Path,
        speech_volume: float = 1.0,
        music_volume: float = 0.3,
        fade_out_duration: float = 2.0,
    ) -> ProcessingResult:
        """
        Create DJ intro by mixing speech with background music.

        Args:
            speech_path: Path to speech/voiceover audio
            music_path: Path to background music
            output_path: Path for output file
            speech_volume: Volume for speech (1.0 = 100%)
            music_volume: Volume for background music
            fade_out_duration: Fade out duration at end

        Returns:
            ProcessingResult
        """
        if not speech_path.exists():
            return ProcessingResult(
                success=False,
                error_message=f"Speech file not found: {speech_path}",
            )

        if not music_path.exists():
            return ProcessingResult(
                success=False,
                error_message=f"Music file not found: {music_path}",
            )

        # Get speech duration
        metadata = await self.get_metadata(speech_path)
        if not metadata:
            return ProcessingResult(
                success=False,
                error_message="Failed to get speech duration",
            )

        speech_duration = metadata.duration_seconds

        # Mix speech over music, duck music under speech
        filter_complex = (
            f"[0:a]volume={speech_volume}[speech];"
            f"[1:a]atrim=0:{speech_duration + fade_out_duration},"
            f"volume={music_volume},"
            f"afade=t=out:st={speech_duration}:d={fade_out_duration}[music];"
            f"[music][speech]amix=inputs=2:duration=longest[out]"
        )

        cmd = [
            self.ffmpeg,
            "-y",
            "-i",
            str(speech_path),
            "-i",
            str(music_path),
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ab",
            "320k",
            str(output_path),
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            return ProcessingResult(
                success=False,
                error_message=f"FFmpeg mixing failed: {stderr}",
            )

        return ProcessingResult(
            success=True,
            output_path=output_path,
        )

    async def stitch_intro_song(
        self,
        intro_path: Path,
        song_path: Path,
        output_path: Path,
        crossfade_duration: float = 1.0,
    ) -> ProcessingResult:
        """
        Stitch DJ intro with song using crossfade.

        Args:
            intro_path: Path to DJ intro audio
            song_path: Path to song audio
            output_path: Path for output file
            crossfade_duration: Crossfade duration in seconds

        Returns:
            ProcessingResult
        """
        return await self.add_crossfade(
            input_paths=[intro_path, song_path],
            output_path=output_path,
            fade_duration=crossfade_duration,
        )

    async def trim_audio(
        self,
        input_path: Path,
        output_path: Path,
        start_seconds: float = 0,
        duration_seconds: Optional[float] = None,
        end_seconds: Optional[float] = None,
    ) -> ProcessingResult:
        """
        Trim audio to specified duration.

        Args:
            input_path: Path to input audio file
            output_path: Path for output file
            start_seconds: Start time in seconds
            duration_seconds: Duration to extract (or use end_seconds)
            end_seconds: End time in seconds

        Returns:
            ProcessingResult
        """
        if not input_path.exists():
            return ProcessingResult(
                success=False,
                error_message=f"Input file not found: {input_path}",
            )

        cmd = [
            self.ffmpeg,
            "-y",
            "-i",
            str(input_path),
            "-ss",
            str(start_seconds),
        ]

        if duration_seconds is not None:
            cmd.extend(["-t", str(duration_seconds)])
        elif end_seconds is not None:
            cmd.extend(["-to", str(end_seconds)])

        cmd.extend(["-c", "copy", str(output_path)])

        returncode, stdout, stderr = await self._run_command(cmd)

        if returncode != 0:
            return ProcessingResult(
                success=False,
                error_message=f"FFmpeg trim failed: {stderr}",
            )

        return ProcessingResult(
            success=True,
            output_path=output_path,
        )

    async def detect_silence(
        self,
        input_path: Path,
        noise_threshold: str = "-50dB",
        min_duration: float = 1.0,
    ) -> list[tuple[float, float]]:
        """
        Detect silence periods in audio.

        Args:
            input_path: Path to audio file
            noise_threshold: Noise threshold in dB
            min_duration: Minimum silence duration in seconds

        Returns:
            List of (start, end) tuples for silence periods
        """
        cmd = [
            self.ffmpeg,
            "-i",
            str(input_path),
            "-af",
            f"silencedetect=noise={noise_threshold}:d={min_duration}",
            "-f",
            "null",
            "-",
        ]

        returncode, stdout, stderr = await self._run_command(cmd)

        silences = []
        current_start = None

        for line in stderr.split("\n"):
            if "silence_start:" in line:
                try:
                    current_start = float(line.split("silence_start:")[1].strip())
                except ValueError:
                    pass
            elif "silence_end:" in line and current_start is not None:
                try:
                    end = float(line.split("silence_end:")[1].split()[0])
                    silences.append((current_start, end))
                    current_start = None
                except ValueError:
                    pass

        return silences


# Singleton instance
_audio_processor: Optional[AudioProcessor] = None


def get_audio_processor() -> AudioProcessor:
    """Get the audio processor singleton."""
    global _audio_processor
    if _audio_processor is None:
        _audio_processor = AudioProcessor()
    return _audio_processor
