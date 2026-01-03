"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed without confirming */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Text for confirm button */
  confirmText?: string;
  /** Text for cancel button */
  cancelText?: string;
  /** Variant for styling */
  variant?: "danger" | "warning" | "info";
  /** Whether action is currently loading */
  isLoading?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

const variantStyles = {
  danger: {
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    buttonClass: "bg-red-500 hover:bg-red-600",
  },
  warning: {
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    buttonClass: "bg-amber-500 hover:bg-amber-600",
  },
  info: {
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    buttonClass: "bg-blue-500 hover:bg-blue-600",
  },
};

/**
 * Confirmation dialog for destructive or important actions
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showLogoutConfirm}
 *   onClose={() => setShowLogoutConfirm(false)}
 *   onConfirm={handleLogout}
 *   title="Sign out?"
 *   description="You'll need to sign in again to access your account."
 *   confirmText="Sign out"
 *   variant="warning"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm"
          >
            <GlassCard variant="elevated" className="overflow-visible">
              <div className="relative p-6">
                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  disabled={isLoading}
                  aria-label="Close dialog"
                  className={cn(
                    "absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 border border-white/10",
                    "flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Icon */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                    styles.iconBg
                  )}
                >
                  {icon || <AlertTriangle className={cn("w-6 h-6", styles.iconColor)} />}
                </div>

                {/* Content */}
                <h2
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-white mb-2"
                >
                  {title}
                </h2>
                <p
                  id="confirm-dialog-description"
                  className="text-sm text-text-muted mb-6"
                >
                  {description}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    disabled={isLoading}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium",
                      "bg-white/5 border border-white/10 text-text-muted",
                      "hover:bg-white/10 hover:text-white transition-colors",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {cancelText}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white",
                      "flex items-center justify-center gap-2 transition-colors",
                      styles.buttonClass,
                      isLoading && "opacity-75 cursor-wait"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      confirmText
                    )}
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for managing confirm dialog state
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const confirmWithLoading = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirmWithLoading,
  };
}
