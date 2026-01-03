"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ListMusic, Filter, SortAsc, RefreshCw, Loader2 } from "lucide-react";
import { QueueList, RequestModal } from "@/components/features";
import { GlassCard, GlowButton, IconButton, InlineErrorBoundary } from "@/components/ui";
import { useQueue, useQueueStats, useVote, useSubmitRequest } from "@/hooks";
import { useAuth } from "@/providers/AuthProvider";
import type { QueueItem, QueueStatus } from "@/types";

interface SubmitRequestData {
  prompt: string;
  genre: string | null;
  isInstrumental: boolean;
  styleTags: string[];
}

export default function QueuePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const { data: queueItems, isLoading, refetch } = useQueue();
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const voteMutation = useVote();
  const submitMutation = useSubmitRequest();

  // Calculate stats from queue items if stats endpoint not available
  const displayStats = stats || {
    pending: queueItems?.filter(i => i.status === "pending").length || 0,
    generating: queueItems?.filter(i => i.status === "generating").length || 0,
    ready: queueItems?.filter(i => i.status === "ready" || i.status === "generated").length || 0,
    average_wait_time: 180, // 3 minutes default
  };

  const handleVote = (itemId: number, type: "up" | "down") => {
    if (!user) {
      // User not authenticated - voting disabled
      return;
    }
    voteMutation.mutate({
      queueItemId: itemId,
      voteType: type === "up" ? "upvote" : "downvote",
      userId: user.id,
    });
  };

  const handleSubmitRequest = async (data: SubmitRequestData) => {
    if (!user) {
      throw new Error("Please log in to submit a request");
    }

    await submitMutation.mutateAsync({
      prompt: data.prompt,
      genre: data.genre,
      isInstrumental: data.isInstrumental,
      styleTags: data.styleTags,
      userId: user.id,
      telegramUserId: user.telegramId || undefined,
    });

    setIsRequestModalOpen(false);
  };

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <ListMusic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Request Queue</h1>
            <p className="text-sm text-text-muted">Loading...</p>
          </div>
        </div>
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center gap-4" role="status" aria-busy="true" aria-label="Loading queue">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-text-muted">Loading queue...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  const items = queueItems || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <ListMusic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Request Queue</h1>
            <p className="text-sm text-text-muted">
              {items.length} requests in queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => refetch()}
            aria-label="Refresh queue"
          />
          <IconButton icon={<Filter className="w-4 h-4" />} aria-label="Filter queue" />
          <IconButton icon={<SortAsc className="w-4 h-4" />} aria-label="Sort queue" />
          <GlowButton
            onClick={() => setIsRequestModalOpen(true)}
            disabled={!isAuthenticated}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            {isAuthenticated ? 'New Request' : 'Login to Request'}
          </GlowButton>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-white">
            {statsLoading ? "..." : displayStats.pending}
          </p>
          <p className="text-xs text-text-muted">Pending</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-violet-400">
            {statsLoading ? "..." : displayStats.generating}
          </p>
          <p className="text-xs text-text-muted">Generating</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {statsLoading ? "..." : displayStats.ready}
          </p>
          <p className="text-xs text-text-muted">Ready</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">
            {statsLoading ? "..." : formatWaitTime(displayStats.average_wait_time)}
          </p>
          <p className="text-xs text-text-muted">Est. Wait</p>
        </GlassCard>
      </div>

      {/* Queue list */}
      {items.length > 0 ? (
        <InlineErrorBoundary fallbackText="Failed to load Queue list">
          <QueueList
            items={items}
            onVote={handleVote}
          />
        </InlineErrorBoundary>
      ) : (
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <ListMusic className="w-12 h-12 text-text-muted opacity-50" />
            <p className="text-text-muted">No requests in queue</p>
            {isAuthenticated && (
              <GlowButton onClick={() => setIsRequestModalOpen(true)}>
                Submit First Request
              </GlowButton>
            )}
          </div>
        </GlassCard>
      )}

      {/* Request modal */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
