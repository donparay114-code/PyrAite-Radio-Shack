"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
  Radio,
} from "lucide-react";
import { GlassCard, GlowButton, IconButton, Badge, LiveBadge, Avatar, AudioProgress } from "@/components/ui";
import { cn, formatDuration, formatNumber } from "@/lib/utils";
import type { Song, QueueItem, User } from "@/types";

interface NowPlayingProps {
  song: Song | null;
  queueItem: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
  onVote: (type: "up" | "down") => void;
  onSeek: (time: number) => void;
}

export function NowPlaying({
  song,
  queueItem,
  isPlaying,
  currentTime,
  onPlayPause,
  onVote,
  onSeek,
}: NowPlayingProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [audioData, setAudioData] = useState<number[]>(new Array(32).fill(0));

  // Audio player ref for real playback
  const audioRef = useRef<HTMLAudioElement>(null);
  const isSeekingRef = useRef(false);

  // Sync audio playback with isPlaying prop
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song?.audio_url) return;

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay may be blocked by browser - user needs to interact first
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, song?.audio_url]);

  // Sync audio mute state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted]);

  // Handle audio time updates for progress bar
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !isSeekingRef.current) {
      onSeek(audio.currentTime);
    }
  }, [onSeek]);

  // Handle seeking from progress bar
  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      isSeekingRef.current = true;
      audio.currentTime = time;
      onSeek(time);
      isSeekingRef.current = false;
    } else {
      onSeek(time);
    }
  }, [onSeek]);

  // Simulate audio visualizer data
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAudioData(
        Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.2)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic glow color based on cover image (simplified)
  const glowColor = useMemo(() => {
    const colors = ["#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#22c55e"];
    if (!song?.id) return colors[0];
    return colors[song.id % colors.length];
  }, [song?.id]);

  if (!song) {
    return (
      <GlassCard className="p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
            <Radio className="w-10 h-10 text-text-muted" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Nothing Playing</h3>
            <p className="text-text-muted text-sm mt-1">
              The station is preparing the next track...
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      {/* Dynamic glow background */}
      <motion.div
        className="absolute -inset-8 rounded-[32px] opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: glowColor }}
        animate={{ opacity: isPlaying ? 0.4 : 0.15 }}
        transition={{ duration: 0.8 }}
      />

      <GlassCard
        variant="elevated"
        className="relative overflow-hidden"
        style={
          isPlaying
            ? {
              boxShadow: `0 0 60px ${glowColor}30, 0 0 120px ${glowColor}15`,
            }
            : undefined
        }
      >
        {/* Hidden audio element for real playback */}
        <audio
          ref={audioRef}
          src={song.audio_url ?? undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onPlayPause}
          preload="metadata"
        />

        <div className="p-6 lg:p-8">
          {/* Header with live badge */}
          <div className="flex items-center justify-between mb-6">
            <LiveBadge />
            <div className="flex items-center gap-2">
              <Badge variant="violet" icon={<Heart className="w-3 h-3" />}>
                {formatNumber(song.total_upvotes)}
              </Badge>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Album art section */}
            <div className="relative flex-shrink-0">
              {/* Album art with animation */}
              <motion.div
                className="relative w-full lg:w-80 aspect-square rounded-2xl overflow-hidden"
                animate={{ scale: isPlaying ? 1.02 : 1 }}
                transition={{ duration: 0.6 }}
              >
                {song.cover_image_url ? (
                  <Image
                    src={song.cover_image_url}
                    alt={song.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Radio className="w-20 h-20 text-white/50" />
                  </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Spinning vinyl effect */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-black/80 border-4 border-white/10" />
                </motion.div>
              </motion.div>

              {/* Reflection */}
              <div className="hidden lg:block absolute -bottom-12 inset-x-4 h-24 rounded-b-2xl overflow-hidden opacity-20">
                <div
                  className="w-full h-full bg-gradient-to-b from-white/20 to-transparent transform scale-y-[-1] blur-sm"
                />
              </div>
            </div>

            {/* Track info section */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              {/* Track details */}
              <div>
                <motion.h2
                  className="text-2xl lg:text-3xl font-bold text-white truncate"
                  layout
                >
                  {song.title}
                </motion.h2>
                <p className="text-lg text-text-muted mt-1 truncate">
                  {song.artist || "AI Generated"}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {song.genre && (
                    <Badge variant="violet">{song.genre}</Badge>
                  )}
                  {song.mood && (
                    <Badge variant="default">{song.mood}</Badge>
                  )}
                  {song.is_instrumental && (
                    <Badge variant="info">Instrumental</Badge>
                  )}
                </div>

                {/* Requester */}
                {queueItem?.user && (
                  <div className="flex items-center gap-3 mt-6">
                    <Avatar
                      name={queueItem.user.display_name || queueItem.user.username || "User"}
                      size="sm"
                      tier={queueItem.user.tier}
                      showTierBorder
                    />
                    <div>
                      <p className="text-sm text-text-muted">Requested by</p>
                      <p className="text-sm font-medium text-white">
                        {queueItem.user.display_name || queueItem.user.username || "Anonymous"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio visualizer */}
              <div className="flex items-end justify-center gap-[2px] h-20 my-6">
                {audioData.map((value, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{ backgroundColor: glowColor }}
                    animate={{
                      height: isPlaying ? `${value * 100}%` : "12%",
                      opacity: isPlaying ? 0.8 : 0.3,
                    }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                  />
                ))}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <AudioProgress
                  currentTime={currentTime}
                  duration={song.duration_seconds || 180}
                  onSeek={handleSeek}
                  color={glowColor}
                />
                <div className="flex justify-between text-xs text-text-muted">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(song.duration_seconds || 180)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-6">
                {/* Vote buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onVote("up")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                      "bg-green-500/20 border border-green-500/30",
                      "text-green-400 text-sm font-medium",
                      "hover:bg-green-500/30 transition-colors"
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{queueItem?.upvotes || 0}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onVote("down")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                      "bg-red-500/20 border border-red-500/30",
                      "text-red-400 text-sm font-medium",
                      "hover:bg-red-500/30 transition-colors"
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{queueItem?.downvotes || 0}</span>
                  </motion.button>
                </div>

                {/* Playback controls */}
                <div className="flex items-center gap-4">
                  <IconButton
                    icon={isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    onClick={() => setIsMuted(!isMuted)}
                  />

                  <motion.button
                    onClick={onPlayPause}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: glowColor }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={isPlaying ? "pause" : "play"}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        className="text-white"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>

                  <IconButton
                    icon={<SkipForward className="w-5 h-5" />}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <IconButton
                    icon={
                      <Heart
                        className={cn("w-5 h-5", isLiked && "fill-red-500 text-red-500")}
                      />
                    }
                    onClick={() => setIsLiked(!isLiked)}
                  />
                  <IconButton icon={<Share2 className="w-5 h-5" />} />
                  <IconButton icon={<Maximize2 className="w-5 h-5" />} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
