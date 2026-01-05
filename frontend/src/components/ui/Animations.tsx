"use client";

import { motion, Variants, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// ============================================
// SLEEK ANIMATION VARIANTS
// ============================================

export const sleekVariants = {
  // Smooth fade up entrance
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  // Scale with fade
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  // Slide from left
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  // Slide from right
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  // Stagger children
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.08 } },
  },
  // Premium spring physics
  springTransition: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
} as const;

// Premium easing curves
export const easings = {
  // Smooth deceleration (like iOS)
  smooth: [0.23, 1, 0.32, 1],
  // Snappy response
  snappy: [0.16, 1, 0.3, 1],
  // Elastic bounce
  bounce: [0.34, 1.56, 0.64, 1],
  // Soft ease out
  gentle: [0.25, 0.1, 0.25, 1],
} as const;

// ============================================
// SHIMMER SKELETON LOADER
// ============================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const variants = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-xl",
  };

  const cssVars = {
    "--skeleton-width": typeof width === "number" ? `${width}px` : width,
    "--skeleton-height": typeof height === "number" ? `${height}px` : height,
  } as React.CSSProperties;

  // eslint-disable-next-line
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/5",
        variants[variant],
        animate && "animate-pulse",
        width && "w-[var(--skeleton-width)]",
        height && "h-[var(--skeleton-height)]",
        className
      )}
      style={cssVars}
    >
      {/* Shimmer effect */}
      {
        animate && (
          <div
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]"
          />
        )
      }
    </div>
  );
}

// ============================================
// SLEEK HOVER CARD
// ============================================

interface HoverCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  glowOnHover?: boolean;
  scaleOnHover?: number;
  liftOnHover?: number;
}

export function HoverCard({
  children,
  className,
  glowOnHover = true,
  scaleOnHover = 1.02,
  liftOnHover = -4,
  ...props
}: HoverCardProps) {
  return (
    <motion.div
      className={cn("relative cursor-pointer", className)}
      whileHover={{
        scale: scaleOnHover,
        y: liftOnHover,
        transition: { duration: 0.2, ease: easings.snappy },
      }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Dynamic glow on hover */}
      {glowOnHover && (
        <motion.div
          className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-xl opacity-0 pointer-events-none"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// ============================================
// STAGGER CONTAINER
// ============================================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
  initialDelay = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// STAGGER ITEM
// ============================================

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: easings.smooth },
        },
        exit: { opacity: 0, y: -10 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PULSE GLOW (Ambient breathing effect)
// ============================================

interface PulseGlowProps {
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  intensity?: number;
}

export function PulseGlow({
  color = "#8b5cf6",
  size = "md",
  className,
  intensity = 0.4,
}: PulseGlowProps) {
  const sizes = {
    sm: "w-32 h-32",
    md: "w-64 h-64",
    lg: "w-96 h-96",
  };

  return (
    <motion.div
      className={cn(
        "absolute rounded-full blur-3xl pointer-events-none",
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
      animate={{
        opacity: [intensity * 0.5, intensity, intensity * 0.5],
        scale: [0.95, 1.05, 0.95],
      }}
      transition={{
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
    />
  );
}

// ============================================
// FLOATING PARTICLES
// ============================================

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export function FloatingParticles({ count = 20, className }: FloatingParticlesProps) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// MAGNETIC BUTTON (Premium button with magnetic hover)
// ============================================

interface MagneticButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  className?: string;
  magneticStrength?: number;
}

export function MagneticButton({
  children,
  className,
  magneticStrength = 0.3,
  ...props
}: MagneticButtonProps) {
  return (
    <motion.button
      className={cn(
        "relative px-6 py-3 rounded-xl",
        "bg-gradient-to-r from-violet-500 to-cyan-500",
        "text-white font-medium",
        "shadow-lg shadow-violet-500/25",
        "transition-shadow duration-300",
        "hover:shadow-xl hover:shadow-violet-500/40",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}

// ============================================
// REVEAL TEXT (Letter by letter animation)
// ============================================

interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function RevealText({ text, className, delay = 0 }: RevealTextProps) {
  const letters = text.split("");

  return (
    <span className={cn("inline-flex overflow-hidden", className)}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.03,
            ease: easings.smooth,
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
}

// ============================================
// LOADING DOTS
// ============================================

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}
