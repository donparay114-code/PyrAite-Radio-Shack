"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ListMusic, Filter, SortAsc, RefreshCw } from "lucide-react";
import { QueueList, RequestModal } from "@/components/features";
import { GlassCard, GlowButton, IconButton } from "@/components/ui";
import { useQueue, useQueueStats } from "@/hooks";
import type { QueueItem } from "@/types";

// Extended mock data
const mockQueueItems: QueueItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  user_id: i + 1,
  song_id: null,
  telegram_user_id: 100000 + i,
  original_prompt: [
    "A funky disco track with groovy bass",
    "Peaceful ambient soundscape for meditation",
    "Hard-hitting trap beat with 808s",
    "Nostalgic 80s power ballad",
    "Progressive house anthem",
    "Indie folk song about wanderlust",
    "Jazz fusion with complex harmonies",
    "Energetic punk rock anthem",
    "Dreamy shoegaze with ethereal vocals",
    "Classic rock guitar solo showcase",
    "Future bass with emotional drops",
    "Reggae vibes for summer days",
    "Dark techno for late nights",
    "Uplifting trance journey",
    "Acoustic singer-songwriter ballad",
  ][i],
  enhanced_prompt: null,
  genre_hint: [
    "Disco",
    "Ambient",
    "Trap",
    "80s",
    "House",
    "Folk",
    "Jazz",
    "Punk",
    "Shoegaze",
    "Rock",
    "Future Bass",
    "Reggae",
    "Techno",
    "Trance",
    "Acoustic",
  ][i],
  style_tags: [],
  is_instrumental: i % 3 === 0,
  status: ["pending", "queued", "generating", "generated", "completed"][i % 5] as any,
  priority_score: 1000 - i * 50,
  base_priority: 100,
  upvotes: Math.floor(Math.random() * 20),
  downvotes: Math.floor(Math.random() * 5),
  suno_job_id: null,
  error_message: null,
  retry_count: 0,
  requested_at: new Date(Date.now() - 1000 * 60 * i * 5).toISOString(),
  queued_at: null,
  generation_started_at: null,
  generation_completed_at: null,
  broadcast_started_at: null,
  completed_at: null,
  user: {
    id: i + 1,
    telegram_id: 100000 + i,
    username: `user_${i + 1}`,
    display_name: `User ${i + 1}`,
    reputation_score: 100 + i * 50,
    tier: ["new", "regular", "trusted", "vip", "elite"][i % 5] as any,
    total_requests: 10 + i,
    successful_requests: 8 + i,
    total_upvotes_received: 50 + i * 10,
    total_downvotes_received: 2 + i,
    is_banned: false,
    is_premium: i % 4 === 0,
    created_at: new Date().toISOString(),
  },
}));

export default function QueuePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // In production:
  // const { data: queueItems, isLoading, refetch } = useQueue();
  // const { data: stats } = useQueueStats();

  const handleVote = (itemId: number, type: "up" | "down") => {
    console.log("Vote:", itemId, type);
  };

  const handleSubmitRequest = async (data: any) => {
    console.log("Submit:", data);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

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
              {mockQueueItems.length} requests in queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            icon={<RefreshCw className="w-4 h-4" />}
            // onClick={() => refetch()}
          />
          <IconButton icon={<Filter className="w-4 h-4" />} />
          <IconButton icon={<SortAsc className="w-4 h-4" />} />
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
          <p className="text-2xl font-bold text-white">5</p>
          <p className="text-xs text-text-muted">Pending</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-violet-400">3</p>
          <p className="text-xs text-text-muted">Generating</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">4</p>
          <p className="text-xs text-text-muted">Ready</p>
        </GlassCard>
        <GlassCard noAnimation className="p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">~3m</p>
          <p className="text-xs text-text-muted">Est. Wait</p>
        </GlassCard>
      </div>

      {/* Queue list */}
      <QueueList
        items={mockQueueItems}
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
