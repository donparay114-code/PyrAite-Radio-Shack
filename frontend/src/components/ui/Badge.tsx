"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "violet";
  size?: "sm" | "md";
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  pulse = false,
  icon,
  className,
  style,
}: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-white/80 border-white/10",
    success: "bg-green-500/20 text-green-400 border-green-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border-red-500/30",
    info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    violet: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    // eslint-disable-next-line react-dom/no-unsafe-inline-style
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variants[variant],
        sizes[size],
        className
      )}
      style={style}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              variant === "success" && "bg-green-400",
              variant === "danger" && "bg-red-400",
              variant === "warning" && "bg-amber-400",
              variant === "info" && "bg-blue-400",
              variant === "violet" && "bg-violet-400",
              variant === "default" && "bg-white/50"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              variant === "success" && "bg-green-400",
              variant === "danger" && "bg-red-400",
              variant === "warning" && "bg-amber-400",
              variant === "info" && "bg-blue-400",
              variant === "violet" && "bg-violet-400",
              variant === "default" && "bg-white/50"
            )}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Live badge for broadcasting
export function LiveBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
        Live
      </span>
    </motion.div>
  );
}

// Status badge for queue items
interface StatusBadgeProps {
  status: string;
  color: string;
  label: string;
}

export function StatusBadge({ status, color, label }: StatusBadgeProps) {
  const isLive = status === "broadcasting";

  return (
    // eslint-disable-next-line react-dom/no-unsafe-inline-style
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      {isLive && (
        <span className="relative flex h-1.5 w-1.5">
          {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
          {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ backgroundColor: color }}
          />
        </span>
      )}
      {label}
    </span>
  );
}
