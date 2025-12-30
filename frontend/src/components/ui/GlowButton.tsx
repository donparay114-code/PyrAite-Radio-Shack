"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlowButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function GlowButton({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  const variants = {
    primary: {
      base: "bg-gradient-to-r from-violet-600 to-violet-500",
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.5)]",
      hover: "hover:shadow-[0_0_30px_rgba(139,92,246,0.7)]",
      text: "text-white",
    },
    secondary: {
      base: "bg-white/[0.06]",
      glow: "",
      hover: "hover:bg-white/[0.1]",
      text: "text-white",
    },
    ghost: {
      base: "bg-transparent",
      glow: "",
      hover: "hover:bg-white/[0.06]",
      text: "text-white/70 hover:text-white",
    },
    danger: {
      base: "bg-gradient-to-r from-red-600 to-red-500",
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.5)]",
      hover: "hover:shadow-[0_0_30px_rgba(239,68,68,0.7)]",
      text: "text-white",
    },
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };

  const style = variants[variant];
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      {...props}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.02 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "font-medium",
        "border border-white/[0.1]",
        "rounded-xl",
        "transition-all duration-300",
        "overflow-hidden",
        "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-background",
        style.base,
        style.glow,
        !isDisabled && style.hover,
        style.text,
        sizes[size],
        isDisabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Loading spinner */}
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {!isLoading && leftIcon && (
        <span className="relative z-10">{leftIcon}</span>
      )}
      <span className="relative z-10">{children}</span>
      {!isLoading && rightIcon && (
        <span className="relative z-10">{rightIcon}</span>
      )}
    </motion.button>
  );
}

// Icon button variant
interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost";
}

export function IconButton({
  icon,
  size = "md",
  variant = "default",
  className,
  ...props
}: IconButtonProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const variants = {
    default:
      "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]",
    ghost: "bg-transparent hover:bg-white/[0.06]",
  };

  return (
    <motion.button
      {...props}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "rounded-full flex items-center justify-center",
        "text-white/70 hover:text-white",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
        sizes[size],
        variants[variant],
        className
      )}
    >
      {icon}
    </motion.button>
  );
}
