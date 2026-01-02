"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  variant?: "default" | "elevated" | "bordered";
  glow?: "none" | "violet" | "cyan";
  noAnimation?: boolean;
  className?: string;
}

export function GlassCard({
  children,
  variant = "default",
  glow = "none",
  noAnimation = false,
  className,
  ...props
}: GlassCardProps) {
  const variants = {
    default: "bg-white/[0.03] backdrop-blur-[16px] border-white/[0.06]",
    elevated: "bg-white/[0.05] backdrop-blur-[20px] border-white/[0.08]",
    bordered: "bg-white/[0.02] backdrop-blur-[12px] border-white/[0.1]",
  };

  const glowStyles = {
    none: "",
    violet: "shadow-glow-md",
    cyan: "shadow-glow-cyan-md",
  };

  const animationProps = noAnimation
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
      };

  return (
    <motion.div
      {...animationProps}
      {...props}
      className={cn(
        "relative overflow-hidden",
        "border rounded-2xl",
        "shadow-glass",
        variants[variant],
        glowStyles[glow],
        className
      )}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noise)%27/%3E%3C/svg%3E')] opacity-[0.02] pointer-events-none rounded-2xl" />

      {/* Gradient highlight on top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Simpler version without motion for static cards
export function StaticGlassCard({
  children,
  variant = "default",
  glow = "none",
  className,
}: Omit<GlassCardProps, "noAnimation">) {
  const variants = {
    default: "bg-white/[0.03] backdrop-blur-[16px] border-white/[0.06]",
    elevated: "bg-white/[0.05] backdrop-blur-[20px] border-white/[0.08]",
    bordered: "bg-white/[0.02] backdrop-blur-[12px] border-white/[0.1]",
  };

  const glowStyles = {
    none: "",
    violet: "shadow-glow-md",
    cyan: "shadow-glow-cyan-md",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "border rounded-2xl",
        "shadow-glass",
        variants[variant],
        glowStyles[glow],
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
