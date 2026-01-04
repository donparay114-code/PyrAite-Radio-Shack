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
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  pulse = false,
  icon,
  className,
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variants[variant],
        sizes[size],
        className
      )}
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
  className?: string; // Replaced color with internal mapping
  label: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const isLive = status === "broadcasting";

  // Status to color mapping
  const statusStyles: Record<string, string> = {
    pending: "bg-gray-500/20 border-gray-500/30 text-gray-400",
    queued: "bg-blue-500/20 border-blue-500/30 text-blue-400",
    generating: "bg-violet-500/20 border-violet-500/30 text-violet-400",
    generated: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
    broadcasting: "bg-red-500/20 border-red-500/30 text-red-400",
    completed: "bg-green-500/20 border-green-500/30 text-green-400",
    failed: "bg-red-500/20 border-red-500/30 text-red-400",
    cancelled: "bg-gray-500/20 border-gray-500/30 text-gray-400",
    moderated: "bg-amber-500/20 border-amber-500/30 text-amber-400",
  };

  const currentStyle = statusStyles[status.toLowerCase()] || statusStyles.pending;

  // Color for the pulse dot
  const dotColorClass = {
    broadcasting: "bg-red-500",
    generating: "bg-violet-500",
    queued: "bg-blue-500",
  }[status.toLowerCase()] || "bg-gray-500";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        currentStyle,
        className
      )}
    >
      {isLive && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              dotColorClass.replace("bg-", "bg-opacity-75 bg-") // slight hack or just use base
            )}
          />
          <span
            className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColorClass)}
          />
        </span>
      )}
      {label}
    </span>
  );
}
