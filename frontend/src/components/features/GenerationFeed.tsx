"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Clock,
  Music,
  Sparkles,
  Loader2,
  Radio,
  AlertCircle,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { GlassCard, Badge, StatusBadge, Avatar, Progress } from "@/components/ui";
import { cn, formatTimeAgo, truncate } from "@/lib/utils";
import type { QueueItem, QueueStatus } from "@/types";

// Types for generation progress events from Socket.IO
interface GenerationProgressEvent {
  queue_item_id: number;
  status: QueueStatus;
  progress?: number; // 0-100
  stage?: string; // e.g., "initializing", "generating", "processing", "finalizing"
  message?: string;
  estimated_time_remaining?: number; // seconds
}

interface GenerationFeedItem extends QueueItem {
  progress?: number;
  stage?: string;
  estimatedTimeRemaining?: number;
}

interface GenerationFeedProps {
  apiBaseUrl?: string;
  socketUrl?: string;
  maxItems?: number;
  onItemComplete?: (item: GenerationFeedItem) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#71717a",
  moderation: "#f59e0b",
  queued: "#3b82f6",
  generating: "#8b5cf6",
  generated: "#22c55e",
  ready: "#22c55e",
  broadcasting: "#ef4444",
  completed: "#22c55e",
  failed: "#ef4444",
  rejected: "#ef4444",
  cancelled: "#71717a",
};

const STATUS_LABELS: Record<string, string> = {
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

const STAGE_LABELS: Record<string, string> = {
  initializing: "Initializing AI...",
  generating: "Creating Music...",
  processing: "Processing Audio...",
  finalizing: "Finalizing Track...",
  uploading: "Uploading...",
};

export function GenerationFeed({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "",
  socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "",
  maxItems = 10,
  onItemComplete,
}: GenerationFeedProps) {
  const [items, setItems] = useState<GenerationFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial data from API
  const fetchGeneratingItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${apiBaseUrl}/api/queue/generating`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      const generatingItems: GenerationFeedItem[] = Array.isArray(data)
        ? data
        : data.items || [];

      setItems(generatingItems.slice(0, maxItems));
    } catch (err) {
      console.error("Error fetching generation feed:", err);
      setError(err instanceof Error ? err.message : "Failed to load generation feed");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, maxItems]);

  // Set up Socket.IO connection
  useEffect(() => {
    fetchGeneratingItems();

    // Initialize Socket.IO connection
    const socket = io(socketUrl || apiBaseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("GenerationFeed: Socket connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("GenerationFeed: Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("GenerationFeed: Socket connection error:", err);
      setIsConnected(false);
    });

    // Listen for generation progress events
    socket.on("generation_progress", (event: GenerationProgressEvent) => {
      setItems((prevItems) => {
        const existingIndex = prevItems.findIndex(
          (item) => item.id === event.queue_item_id
        );

        // Check if item is completed/failed and should be removed
        const isCompleted = ["completed", "generated", "ready", "failed", "rejected", "cancelled"]
          .includes(event.status);

        if (existingIndex >= 0) {
          // Update existing item
          const updatedItems = [...prevItems];
          const existingItem = updatedItems[existingIndex];

          if (isCompleted) {
            // Remove completed item with delay for exit animation
            if (onItemComplete) {
              onItemComplete({ ...existingItem, ...event } as GenerationFeedItem);
            }
            return updatedItems.filter((_, idx) => idx !== existingIndex);
          }

          updatedItems[existingIndex] = {
            ...existingItem,
            status: event.status,
            progress: event.progress,
            stage: event.stage,
            estimatedTimeRemaining: event.estimated_time_remaining,
          };
          return updatedItems;
        } else if (!isCompleted) {
          // Add new item if not already completed
          const newItem: GenerationFeedItem = {
            id: event.queue_item_id,
            status: event.status,
            progress: event.progress,
            stage: event.stage,
            estimatedTimeRemaining: event.estimated_time_remaining,
            user_id: null,
            song_id: null,
            telegram_user_id: null,
            original_prompt: "Loading...",
            enhanced_prompt: null,
            genre_hint: null,
            style_tags: [],
            is_instrumental: false,
            priority_score: 0,
            base_priority: 0,
            upvotes: 0,
            downvotes: 0,
            suno_job_id: null,
            error_message: null,
            retry_count: 0,
            requested_at: new Date().toISOString(),
            queued_at: null,
            generation_started_at: null,
            generation_completed_at: null,
            broadcast_started_at: null,
            completed_at: null,
          };
          return [newItem, ...prevItems].slice(0, maxItems);
        }

        return prevItems;
      });
    });

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("generation_progress");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl, apiBaseUrl, fetchGeneratingItems, maxItems, onItemComplete]);

  // Filter to show only pending, queued, and generating items
  const activeItems = items.filter((item) =>
    ["pending", "queued", "generating", "moderation"].includes(item.status)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Generation Feed</h2>
            <p className="text-xs text-text-muted">
              {activeItems.length} active generation{activeItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-xs text-text-muted">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-text-muted">Loading generation feed...</p>
          </div>
        </GlassCard>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <GlassCard className="p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load generation feed</p>
              <p className="text-sm text-text-muted">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Empty state */}
      {!isLoading && !error && activeItems.length === 0 && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Radio className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No Active Generations</h3>
              <p className="text-text-muted text-sm mt-1">
                New song requests will appear here as they are processed
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Generation items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {activeItems.map((item, index) => (
            <GenerationItemCard key={item.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface GenerationItemCardProps {
  item: GenerationFeedItem;
  index: number;
}

function GenerationItemCard({ item, index }: GenerationItemCardProps) {
  const isGenerating = item.status === "generating";

  // Get status icon
  const StatusIcon = {
    pending: Clock,
    moderation: AlertCircle,
    queued: Music,
    generating: Sparkles,
  }[item.status] || Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.9 }}
      transition={{
        layout: { duration: 0.3 },
        opacity: { duration: 0.2 },
        y: { duration: 0.3, delay: index * 0.05 },
        scale: { duration: 0.2 },
      }}
      className="relative group"
    >
      {/* Pulse glow effect for generating items */}
      {isGenerating && (
        <motion.div
          className="absolute -inset-1 rounded-3xl bg-violet-500/20 blur-xl"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <GlassCard
        variant={isGenerating ? "elevated" : "default"}
        noAnimation
        className={cn(
          "relative transition-all duration-300",
          "hover:border-white/[0.12]",
          isGenerating && "border-violet-500/30"
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Status indicator with icon */}
            <div
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                isGenerating
                  ? "bg-violet-500/20 border border-violet-500/30"
                  : "bg-white/5"
              )}
            >
              {isGenerating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </motion.div>
              ) : (
                <StatusIcon className="w-5 h-5 text-text-muted" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Genre badge */}
                  {item.genre_hint && (
                    <Badge variant="violet" size="sm">
                      <Music className="w-3 h-3 mr-1" />
                      {item.genre_hint}
                    </Badge>
                  )}

                  {/* User info */}
                  {item.user ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        name={item.user.display_name || item.user.username || "User"}
                        size="sm"
                        tier={item.user.tier}
                      />
                      <span className="text-xs text-text-muted truncate max-w-[100px]">
                        {item.user.display_name || item.user.username || "Anonymous"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span className="text-xs">Anonymous</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <StatusBadge
                  status={item.status}
                  color={STATUS_COLORS[item.status]}
                  label={STATUS_LABELS[item.status]}
                />
              </div>

              {/* Prompt preview */}
              <p className="mt-2 text-sm text-white/80 line-clamp-2">
                {truncate(item.original_prompt, 120)}
              </p>

              {/* Progress section for generating items */}
              {isGenerating && (
                <div className="mt-3 space-y-2">
                  {/* Stage indicator */}
                  {item.stage && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      <span className="text-xs text-violet-400">
                        {STAGE_LABELS[item.stage] || item.stage}
                      </span>
                      {item.estimatedTimeRemaining && (
                        <span className="text-xs text-text-muted">
                          ~{Math.ceil(item.estimatedTimeRemaining / 60)}m remaining
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {typeof item.progress === "number" && (
                    <Progress
                      value={item.progress}
                      max={100}
                      size="sm"
                      color="violet"
                      animated
                    />
                  )}
                </div>
              )}

              {/* Footer row */}
              <div className="flex items-center justify-between mt-3">
                {/* Time info */}
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(item.requested_at)}
                </span>

                {/* Priority indicator */}
                {item.priority_score > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Zap className="w-3 h-3" />
                    <span>{Math.round(item.priority_score)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default GenerationFeed;
