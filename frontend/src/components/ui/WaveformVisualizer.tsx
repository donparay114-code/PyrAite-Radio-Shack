"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  /** Current playback progress (0-1) */
  progress: number;
  /** Duration in seconds */
  duration: number;
  /** Current time in seconds */
  currentTime: number;
  /** Whether audio is playing */
  isPlaying: boolean;
  /** Callback when user seeks */
  onSeek?: (time: number) => void;
  /** Primary color for the waveform */
  color?: string;
  /** Height of the visualizer */
  height?: number;
  /** Additional classes */
  className?: string;
}

// Generate a smooth flowing waveform path
function generateWaveformPath(
  width: number,
  height: number,
  segments: number,
  seed: number
): string {
  const points: { x: number; y: number }[] = [];
  const centerY = height / 2;
  const amplitude = height * 0.35;

  // Generate waveform points with organic variation
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    // Use multiple sine waves for organic look
    const wave1 = Math.sin((i / segments) * Math.PI * 4 + seed) * 0.5;
    const wave2 = Math.sin((i / segments) * Math.PI * 2 + seed * 1.5) * 0.3;
    const wave3 = Math.sin((i / segments) * Math.PI * 8 + seed * 0.7) * 0.2;
    const combinedWave = wave1 + wave2 + wave3;

    // Add some randomness based on position
    const noise = Math.sin(i * 0.5 + seed) * 0.1;
    const y = centerY - (combinedWave + noise) * amplitude;

    points.push({ x, y });
  }

  // Create smooth bezier curve through points
  let path = `M ${points[0].x} ${centerY}`;
  path += ` L ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate control points for smooth curve
    const cp1x = prev.x + (curr.x - prev.x) * 0.5;
    const cp1y = prev.y + (curr.y - prev.y) * 0.5;
    const cp2x = curr.x - (next.x - prev.x) * 0.15;
    const cp2y = curr.y - (next.y - prev.y) * 0.15;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  // Complete to last point
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  // Mirror the waveform to create symmetric shape
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    const mirrorY = centerY + (centerY - point.y);
    path += ` L ${point.x} ${mirrorY}`;
  }

  path += " Z";
  return path;
}

export function WaveformVisualizer({
  progress,
  duration,
  currentTime,
  isPlaying,
  onSeek,
  color = "#8b5cf6",
  height = 80,
  className,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [animationSeed, setAnimationSeed] = useState(0);

  // Update width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Animate waveform when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAnimationSeed((prev) => prev + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Generate waveform path
  const waveformPath = useMemo(() => {
    return generateWaveformPath(width, height, 60, animationSeed);
  }, [width, height, animationSeed]);

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const seekProgress = clickX / rect.width;
      const seekTime = seekProgress * duration;
      onSeek(seekTime);
    },
    [onSeek, duration]
  );

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setHoverX(e.clientX - rect.left);
    },
    []
  );

  const progressWidth = `${progress * 100}%`;
  const hoverProgress = containerRef.current
    ? (hoverX / containerRef.current.offsetWidth) * duration
    : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative cursor-pointer select-none",
        className
      )}
      style={{ height }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      role="slider"
      aria-label="Audio progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          {/* Gradient for played portion */}
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
          </linearGradient>

          {/* Mask for progress clipping */}
          <clipPath id="progressClip">
            <rect x="0" y="0" width={progressWidth} height={height} />
          </clipPath>

          {/* Glow filter */}
          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background waveform (muted) */}
        <motion.path
          d={waveformPath}
          fill="rgba(255, 255, 255, 0.1)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Played portion (colored with gradient) */}
        <g clipPath="url(#progressClip)">
          <motion.path
            d={waveformPath}
            fill="url(#waveGradient)"
            filter={isPlaying ? "url(#waveGlow)" : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </g>

        {/* Progress scrubber line */}
        <motion.line
          x1={progress * width}
          y1={0}
          x2={progress * width}
          y2={height}
          stroke="white"
          strokeWidth={isHovering ? 3 : 2}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
        />

        {/* Scrubber dot */}
        <motion.circle
          cx={progress * width}
          cy={height / 2}
          r={isHovering ? 8 : 6}
          fill="white"
          animate={{
            scale: isHovering ? 1.2 : 1,
            opacity: isHovering ? 1 : 0.9,
          }}
          transition={{ duration: 0.15 }}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        />

        {/* Hover preview line */}
        {isHovering && (
          <motion.line
            x1={hoverX}
            y1={0}
            x2={hoverX}
            y2={height}
            stroke="white"
            strokeWidth={1}
            strokeOpacity={0.4}
            strokeDasharray="4 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </svg>

      {/* Hover time tooltip */}
      {isHovering && (
        <motion.div
          className="absolute -top-8 px-2 py-1 bg-black/80 rounded text-xs text-white whitespace-nowrap pointer-events-none"
          style={{ left: hoverX, transform: "translateX(-50%)" }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {formatTime(hoverProgress)}
        </motion.div>
      )}
    </div>
  );
}

// Format seconds to mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default WaveformVisualizer;
