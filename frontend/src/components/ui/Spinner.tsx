"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** Size of the spinner */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Color variant */
  variant?: "default" | "primary" | "white" | "muted";
  /** Additional class names */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

const sizeClasses = {
  xs: "w-3 h-3 border",
  sm: "w-4 h-4 border",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
  xl: "w-12 h-12 border-3",
};

const variantClasses = {
  default: "border-violet-500/30 border-t-violet-500",
  primary: "border-violet-400/30 border-t-violet-400",
  white: "border-white/20 border-t-white",
  muted: "border-text-muted/30 border-t-text-muted",
};

/**
 * Standardized loading spinner component
 * Use this instead of inline spinner styles for consistency
 */
export function Spinner({
  size = "md",
  variant = "default",
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn(
        "rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label={label}
    />
  );
}

/**
 * Spinner with text label
 */
export function SpinnerWithLabel({
  size = "md",
  variant = "default",
  label = "Loading...",
  className,
}: SpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      role="status"
      aria-busy="true"
    >
      <Spinner size={size} variant={variant} />
      <p className="text-text-muted text-sm">{label}</p>
    </div>
  );
}

/**
 * Inline spinner using Lucide Loader2 icon (for buttons, etc.)
 * Note: Import Loader2 from lucide-react where needed
 */
export const spinnerIconClass = "animate-spin";
