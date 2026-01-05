"use client";

import { useState } from "react";
import { ListMusic, Filter, SortAsc, RefreshCw, Loader2 } from "lucide-react";
import { QueueList, RequestModal } from "@/components/features";
import { GlassCard, GlowButton, IconButton } from "@/components/ui";
import { useQueue, useQueueStats, useVote } from "@/hooks";

export default function QueuePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { data: queueItems, isLoading, refetch } = useQueue();
  const { data: stats } = useQueueStats();
  const voteMutation = useVote();

  const handleVote = (itemId: number, type: "up" | "down") => {
    voteMutation.mutate({
      queueItemId: itemId,
      voteType: type === "up" ? "upvote" : "downvote",
      userId: 1, // TODO: Get from auth context
    });
  };

  const handleSubmitRequest = async (data: any) => {
    console.log("Submit:", data);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
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
              {stats?.total_items || items.length} requests in queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Refresh queue"
            onClick={() => refetch()}
          />
          <IconButton icon={<Filter className="w-4 h-4" />} label="Filter queue" />
          <IconButton icon={<SortAsc className="w-4 h-4" />} label="Sort queue" />
          <GlowButton
            onClick={() => setIsRequestModalOpen(true)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Request
          </GlowButton>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats?.pending || 0}</p>
          <p className="text-xs text-text-muted">Pending</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-violet-400">{stats?.generating || 0}</p>
          <p className="text-xs text-text-muted">Generating</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats?.completed_today || 0}</p>
          <p className="text-xs text-text-muted">Completed Today</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">~{stats?.average_wait_minutes || 0}m</p>
          <p className="text-xs text-text-muted">Est. Wait</p>
        </GlassCard>
      </div>

      {/* Queue list */}
      <QueueList
        items={items}
        onVote={handleVote}
      />

      {/* Request modal */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
