"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { io } from "socket.io-client";
import { cn } from "@/lib/utils";
import { VoteType } from "@/types";

export type VoteState = "up" | "down" | null;

interface VoteControlProps {
  /** The queue item ID to vote on */
  queueItemId: number;
  /** Initial upvote count */
  initialUpvotes?: number;
  /** Initial downvote count */
  initialDownvotes?: number;
  /** Current user's vote state */
  userVote?: VoteState;
  /** Callback when vote changes */
  onVoteChange?: (voteType: VoteState, upvotes: number, downvotes: number) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
  /** Telegram user ID for vote submission */
  telegramUserId?: number;
  /** Disable voting */
  disabled?: boolean;
}

interface VoteUpdatePayload {
  queue_id: number;
  upvotes: number;
  downvotes: number;
  score: number;
}

export function VoteControl({
  queueItemId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  userVote: initialUserVote = null,
  onVoteChange,
  size = "md",
  className,
  telegramUserId,
  disabled = false,
}: VoteControlProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteState>(initialUserVote);
  const [isLoading, setIsLoading] = useState<"up" | "down" | null>(null);

  // Size variants for buttons
  const sizeClasses = {
    sm: {
      button: "px-2 py-1.5 rounded-lg",
      icon: "w-3.5 h-3.5",
      text: "text-xs",
      gap: "gap-1",
    },
    md: {
      button: "px-3 py-2 rounded-xl",
      icon: "w-4 h-4",
      text: "text-sm",
      gap: "gap-1.5",
    },
    lg: {
      button: "px-4 py-2.5 rounded-xl",
      icon: "w-5 h-5",
      text: "text-base",
      gap: "gap-2",
    },
  };

  const styles = sizeClasses[size];

  // Connect to Socket.IO and listen for vote updates
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const s = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log("[VoteControl] Socket connected");
    });

    s.on("disconnect", () => {
      console.log("[VoteControl] Socket disconnected");
    });

    // Listen for vote_updated events
    s.on("vote_updated", (data: VoteUpdatePayload) => {
      if (data.queue_id === queueItemId) {
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
      }
    });

    s.on("error", (error: unknown) => {
      console.error("[VoteControl] Socket error:", error);
    });

    return () => {
      s.disconnect();
    };
  }, [queueItemId]);

  // Sync with prop changes
  useEffect(() => {
    setUpvotes(initialUpvotes);
  }, [initialUpvotes]);

  useEffect(() => {
    setDownvotes(initialDownvotes);
  }, [initialDownvotes]);

  useEffect(() => {
    setUserVote(initialUserVote);
  }, [initialUserVote]);

  // Submit vote to API
  const submitVote = useCallback(
    async (voteType: "up" | "down") => {
      if (disabled || isLoading) return;

      setIsLoading(voteType);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/votes/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_user_id: telegramUserId,
            queue_item_id: queueItemId,
            vote_type: voteType === "up" ? VoteType.UPVOTE : VoteType.DOWNVOTE,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to submit vote");
        }

        const data = await response.json();

        // Calculate new vote state
        let newUserVote: VoteState;
        let newUpvotes = upvotes;
        let newDownvotes = downvotes;

        if (userVote === voteType) {
          // User is removing their vote
          newUserVote = null;
          if (voteType === "up") {
            newUpvotes = Math.max(0, upvotes - 1);
          } else {
            newDownvotes = Math.max(0, downvotes - 1);
          }
        } else {
          // User is changing or adding a vote
          if (userVote === "up") {
            newUpvotes = Math.max(0, upvotes - 1);
          } else if (userVote === "down") {
            newDownvotes = Math.max(0, downvotes - 1);
          }

          newUserVote = voteType;
          if (voteType === "up") {
            newUpvotes = newUpvotes + 1;
          } else {
            newDownvotes = newDownvotes + 1;
          }
        }

        // Update local state optimistically (server may send different values via socket)
        setUserVote(newUserVote);
        setUpvotes(data.upvotes ?? newUpvotes);
        setDownvotes(data.downvotes ?? newDownvotes);

        // Notify parent component
        onVoteChange?.(
          newUserVote,
          data.upvotes ?? newUpvotes,
          data.downvotes ?? newDownvotes
        );
      } catch (error) {
        console.error("[VoteControl] Error submitting vote:", error);
      } finally {
        setIsLoading(null);
      }
    },
    [
      disabled,
      isLoading,
      telegramUserId,
      queueItemId,
      userVote,
      upvotes,
      downvotes,
      onVoteChange,
    ]
  );

  const handleUpvote = () => submitVote("up");
  const handleDownvote = () => submitVote("down");

  return (
    <div className={cn("flex items-center", styles.gap, className)}>
      {/* Upvote button */}
      <motion.button
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
        onClick={handleUpvote}
        disabled={disabled || isLoading !== null}
        className={cn(
          "relative flex items-center font-medium transition-all duration-200",
          "border backdrop-blur-sm",
          styles.button,
          styles.text,
          styles.gap,
          userVote === "up"
            ? "bg-green-500/30 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/30",
          (disabled || isLoading !== null) && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Upvote"
        aria-pressed={userVote === "up"}
      >
        {/* Glass-morphism inner highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />

        <AnimatePresence mode="wait">
          {isLoading === "up" ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
            >
              <Loader2 className={cn(styles.icon, "animate-spin")} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <ThumbsUp
                className={cn(styles.icon, userVote === "up" && "fill-green-400")}
              />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.span
            key={upvotes}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="font-bold tabular-nums"
          >
            {upvotes}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Downvote button */}
      <motion.button
        whileHover={disabled ? {} : { scale: 1.1 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
        onClick={handleDownvote}
        disabled={disabled || isLoading !== null}
        className={cn(
          "relative flex items-center font-medium transition-all duration-200",
          "border backdrop-blur-sm",
          styles.button,
          styles.text,
          styles.gap,
          userVote === "down"
            ? "bg-red-500/30 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30",
          (disabled || isLoading !== null) && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Downvote"
        aria-pressed={userVote === "down"}
      >
        {/* Glass-morphism inner highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />

        <AnimatePresence mode="wait">
          {isLoading === "down" ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
            >
              <Loader2 className={cn(styles.icon, "animate-spin")} />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <ThumbsDown
                className={cn(styles.icon, userVote === "down" && "fill-red-400")}
              />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.span
            key={downvotes}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="font-bold tabular-nums"
          >
            {downvotes}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

// Compact variant for tight spaces like tables
interface CompactVoteControlProps {
  queueItemId: number;
  upvotes: number;
  downvotes: number;
  userVote?: VoteState;
  onVote: (queueItemId: number, voteType: "up" | "down") => void;
  className?: string;
}

export function CompactVoteControl({
  queueItemId,
  upvotes,
  downvotes,
  userVote,
  onVote,
  className,
}: CompactVoteControlProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onVote(queueItemId, "up")}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded-md",
          "text-xs font-medium transition-colors",
          userVote === "up"
            ? "bg-green-500/30 text-green-300"
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
        )}
      >
        <ThumbsUp
          className={cn("w-3 h-3", userVote === "up" && "fill-green-400")}
        />
        <span>{upvotes}</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onVote(queueItemId, "down")}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded-md",
          "text-xs font-medium transition-colors",
          userVote === "down"
            ? "bg-red-500/30 text-red-300"
            : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
        )}
      >
        <ThumbsDown
          className={cn("w-3 h-3", userVote === "down" && "fill-red-400")}
        />
        <span>{downvotes}</span>
      </motion.button>
    </div>
  );
}

// Score display showing net votes
interface VoteScoreProps {
  upvotes: number;
  downvotes: number;
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VoteScore({
  upvotes,
  downvotes,
  showBreakdown = false,
  size = "md",
  className,
}: VoteScoreProps) {
  const score = upvotes - downvotes;
  const isPositive = score > 0;
  const isNegative = score < 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.span
        key={score}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "font-bold tabular-nums",
          sizeClasses[size],
          isPositive && "text-green-400",
          isNegative && "text-red-400",
          !isPositive && !isNegative && "text-text-muted"
        )}
      >
        {isPositive && "+"}
        {score}
      </motion.span>

      {showBreakdown && (
        <span className={cn("text-text-muted", sizeClasses[size])}>
          ({upvotes}/{downvotes})
        </span>
      )}
    </div>
  );
}

export default VoteControl;
