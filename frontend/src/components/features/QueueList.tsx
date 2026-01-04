"use client";

import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState } from "react";
import {
  Clock,
  Music,
  Sparkles,
  Radio,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { GlassCard, Badge, StatusBadge, Avatar, GlowButton } from "@/components/ui";
import { CompactVoteControl } from "@/components/features/VoteControl";
import { cn, formatTimeAgo, truncate } from "@/lib/utils";
import type { QueueItem, QueueStatus, STATUS_COLORS, STATUS_LABELS } from "@/types";

interface QueueListProps {
  items: QueueItem[];
  onVote: (itemId: number, type: "up" | "down") => void;
  onCancel?: (itemId: number) => void;
  currentItemId?: number;
}

export function QueueList({ items, onVote, onCancel, currentItemId }: QueueListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "generating" | "completed">("all");

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "pending") return ["pending", "queued", "moderation"].includes(item.status);
    if (filter === "generating") return ["generating", "generated"].includes(item.status);
    if (filter === "completed") return ["completed", "broadcasting"].includes(item.status);
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Request Queue</h2>
        <div className="flex items-center gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          >
            Pending
          </FilterButton>
          <FilterButton
            active={filter === "generating"}
            onClick={() => setFilter("generating")}
          >
            Generating
          </FilterButton>
          <FilterButton
            active={filter === "completed"}
            onClick={() => setFilter("completed")}
          >
            Done
          </FilterButton>
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <Music className="w-12 h-12 mx-auto text-text-muted mb-4" />
              <p className="text-text-muted">No requests in queue</p>
            </motion.div>
          ) : (
            filteredItems.map((item, index) => (
              <QueueItemCard
                key={item.id}
                item={item}
                index={index}
                isPlaying={item.id === currentItemId}
                onVote={onVote}
                onCancel={onCancel}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface QueueItemCardProps {
  item: QueueItem;
  index: number;
  isPlaying: boolean;
  onVote: (itemId: number, type: "up" | "down") => void;
  onCancel?: (itemId: number) => void;
}

function QueueItemCard({ item, index, isPlaying, onVote, onCancel }: QueueItemCardProps) {


  const statusLabels: Record<string, string> = {
    pending: "Pending",
    moderation: "In Review",
    queued: "Queued",
    generating: "Generating",
    generated: "Generated",
    ready: "Ready",
    broadcasting: "On Air",
    completed: "Completed",
    failed: "Failed",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

  const StatusIcon = {
    pending: Clock,
    moderation: AlertCircle,
    queued: Music,
    generating: Sparkles,
    generated: CheckCircle2,
    ready: CheckCircle2,
    broadcasting: Radio,
    completed: CheckCircle2,
    failed: XCircle,
    rejected: XCircle,
    cancelled: XCircle,
  }[item.status] || Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative group",
        isPlaying && "z-10"
      )}
    >
      {/* Glow effect for playing item */}
      {isPlaying && (
        <motion.div
          className="absolute -inset-2 rounded-3xl bg-violet-500/20 blur-xl"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <GlassCard
        variant={isPlaying ? "elevated" : "default"}
        noAnimation
        className={cn(
          "relative transition-all duration-300",
          "hover:border-white/[0.12]",
          isPlaying && "border-violet-500/30"
        )}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Position number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-text-muted">
            {index + 1}
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">
                {truncate(item.original_prompt, 50)}
              </h3>
              {item.status === "generating" && (
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              {/* User */}
              {item.user && (
                <div className="flex items-center gap-1.5">
                  <Avatar
                    name={item.user.display_name || item.user.username || "User"}
                    size="sm"
                  />
                  <span className="text-xs text-text-muted">
                    {item.user.display_name || item.user.username || "Anonymous"}
                  </span>
                </div>
              )}

              {/* Time */}
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(item.requested_at)}
              </span>

              {/* Genre */}
              {item.genre_hint && (
                <Badge variant="default" size="sm">
                  {item.genre_hint}
                </Badge>
              )}
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge
            status={item.status}
            label={statusLabels[item.status]}
          />

          {/* Vote buttons - using VoteControl for real-time updates */}
          <CompactVoteControl
            queueItemId={item.id}
            upvotes={item.upvotes}
            downvotes={item.downvotes}
            onVote={onVote}
          />

          {/* Priority score */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-text-muted">Priority</span>
            <span className="text-sm font-bold text-gradient">
              {Math.round(item.priority_score)}
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-white/10 text-white border border-white/20"
          : "text-text-muted hover:text-white hover:bg-white/5"
      )}
    >
      {children}
    </motion.button>
  );
}
