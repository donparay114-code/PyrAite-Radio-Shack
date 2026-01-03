'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useSocket } from '../../../frontend/src/hooks/useSocket';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { formatNumber } from '@/lib/utils';
import { getGenreColor } from '@/lib/design-tokens';

interface AudioPlayerProps {
  channelId: string;
  channelName: string;
  genre?: string;
  hlsUrl: string;
  fallbackUrl: string;
  artwork?: string;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

/** Seek amount in seconds for skip back */
const SEEK_BACK_SECONDS = 10;

export function AudioPlayer({
  channelId,
  channelName,
  genre,
  hlsUrl,
  fallbackUrl,
  artwork,
  onSkipBack,
  onSkipForward,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { nowPlaying, queue, listenerCount, isConnected } = useSocket(channelId);

  // Initialize HLS
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Hls.isSupported()) {
      hlsRef.current = new Hls({
        maxBufferLength: 30,
        liveSyncDurationCount: 2,
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current.loadSource(hlsUrl);
      hlsRef.current.attachMedia(audio);

      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded');
        setError(null);
      });

      hlsRef.current.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hlsRef.current?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hlsRef.current?.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, falling back to direct stream');
              setError('Stream error. Trying fallback...');
              audio.src = fallbackUrl;
              break;
          }
        }
      });
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      audio.src = hlsUrl;
    } else {
      // No HLS support, use fallback
      audio.src = fallbackUrl;
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [channelId, hlsUrl, fallbackUrl]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        setError(null);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play stream. Please try again.');
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  /**
   * Skip back by seeking the audio buffer backwards.
   * For live streams with HLS buffer, this seeks back within available buffer.
   * Falls back to custom callback if provided.
   */
  const handleSkipBack = () => {
    if (onSkipBack) {
      onSkipBack();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Seek back within the buffer (for live streams with some buffer)
    const newTime = Math.max(0, audio.currentTime - SEEK_BACK_SECONDS);
    audio.currentTime = newTime;
  };

  /**
   * Skip forward to next track.
   * Uses custom callback if provided.
   */
  const handleSkipForward = () => {
    if (onSkipForward) {
      onSkipForward();
    }
    // Note: For live streams, skipping forward typically requires
    // backend coordination (vote-to-skip or admin skip)
  };

  const genreColor = genre ? getGenreColor(genre) : '#1DB954';

  return (
    <GlassCard padding="lg" className="w-full max-w-2xl">
      <audio ref={audioRef} preload="none" />

      {/* Channel Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: genreColor }}>
            {channelName}
          </h2>
          {genre && <p className="text-sm text-text-secondary">{genre}</p>}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-status-success' : 'bg-status-error'}`}
          />
          <span className="text-sm text-text-tertiary">
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Album Art */}
      {(artwork || nowPlaying?.artwork) && (
        <div className="relative mb-6 overflow-hidden rounded-lg">
          <img
            src={artwork || nowPlaying?.artwork}
            alt={nowPlaying?.title || channelName}
            className="aspect-square w-full object-cover"
            style={{
              boxShadow: `0 20px 60px rgba(${genreColor}, 0.4)`,
            }}
          />

          {/* Visualizer Bars */}
          {isPlaying && (
            <div className="absolute bottom-[-12px] left-1/2 flex -translate-x-1/2 gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: '20px',
                    backgroundColor: genreColor,
                    animation: `pulse 0.${8 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Now Playing Info */}
      <div className="mb-6 text-center">
        {nowPlaying ? (
          <>
            <h3 className="mb-1 text-xl font-semibold">
              {nowPlaying.title || 'Unknown Track'}
            </h3>
            <p className="text-text-secondary">
              Requested by @{nowPlaying.username || 'Anonymous'}
            </p>
          </>
        ) : (
          <p className="text-text-tertiary">Waiting for next track...</p>
        )}
      </div>

      {/* Playback Controls */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          aria-label="Skip back 10 seconds"
          title="Skip back 10 seconds"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
            />
          </svg>
        </Button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-105"
          style={{
            backgroundColor: genreColor,
            boxShadow: `0 0 20px rgba(${genreColor}, 0.3)`,
          }}
        >
          {isPlaying ? (
            <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipForward}
          disabled={!onSkipForward}
          aria-label="Skip to next track"
          title={onSkipForward ? "Skip to next track" : "Skip not available"}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
            />
          </svg>
        </Button>
      </div>

      {/* Volume Control */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={toggleMute} className="text-text-secondary hover:text-text-primary">
          {isMuted || volume === 0 ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12a4.5 4.5 0 00-1.703-3.526L13.5 9.77V14.23l1.297 1.297A4.472 4.472 0 0016.5 12zM14 3.23v4.746l2.5 2.5A6.465 6.465 0 0018.5 12c0 2.39-1.314 4.476-3.25 5.58l2.121 2.122A8.961 8.961 0 0020.5 12c0-3.168-1.636-5.948-4.106-7.559L14 6.682V3.23zm-2 18.54L6.854 16.623 1.5 11.27v1.458L6.854 18.08 12 23.23v-1.46zM4.273 7.145L3 8.418 7.582 13H1.5v-2h5.175L12 5.673V2.77L4.273 7.145z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if (isMuted) setIsMuted(false);
          }}
          className="flex-1"
          style={{
            accentColor: genreColor,
          }}
        />

        <span className="w-12 text-right text-sm text-text-tertiary">{volume}%</span>
      </div>

      {/* Listener Count */}
      <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        <span>{formatNumber(listenerCount)} listening</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-status-error/20 p-3 text-center text-sm text-status-error">
          {error}
        </div>
      )}

      {/* Queue Preview */}
      {queue.length > 0 && (
        <div className="mt-6 border-t border-glass-border pt-6">
          <h4 className="mb-3 text-sm font-semibold text-text-secondary">Up Next:</h4>
          <div className="space-y-2">
            {queue.slice(0, 3).map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-lg bg-glass-light p-3"
              >
                <span className="text-xs text-text-tertiary">{index + 1}</span>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm text-text-primary">
                    {track.customTitle || track.prompt}
                  </p>
                  <p className="text-xs text-text-tertiary">@{track.userId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
