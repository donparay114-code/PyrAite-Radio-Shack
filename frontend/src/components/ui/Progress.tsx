"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "violet" | "cyan" | "gradient";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = "md",
  color = "violet",
  showLabel = false,
  animated = true,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const colors = {
    violet: "bg-violet-500",
    cyan: "bg-cyan-500",
    gradient: "bg-gradient-to-r from-violet-500 to-cyan-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-text-muted">Progress</span>
          <span className="text-xs font-medium text-text">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative w-full bg-white/10 rounded-full overflow-hidden",
          sizes[size]
        )}
      >
        <motion.div
          className={cn("h-full rounded-full", colors[color])}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Shimmer effect */}
        {percentage > 0 && percentage < 100 && (
          <motion.div
            className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}

// Circular progress indicator
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "#8b5cf6",
  showValue = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-text">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Audio progress bar with interactive scrubbing
interface AudioProgressProps {
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  color?: string;
  className?: string;
}

export function AudioProgress({
  currentTime,
  duration,
  onSeek,
  color = "#8b5cf6",
  className,
}: AudioProgressProps) {
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  return (
    <div
      className={cn(
        "relative h-1 bg-white/10 rounded-full cursor-pointer group",
        className
      )}
      onClick={handleClick}
    >
      {/* Progress fill */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.1 }}
      />

      {/* Hover expansion */}
      <div className="absolute inset-0 rounded-full transition-all duration-200 group-hover:scale-y-150" />

      {/* Scrubber dot */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          left: `${percentage}%`,
          backgroundColor: color,
          marginLeft: "-6px",
        }}
        whileHover={{ scale: 1.2 }}
      />
    </div>
  );
}
