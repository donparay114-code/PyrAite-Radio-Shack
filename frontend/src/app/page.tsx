"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Music, Clock, Loader2 } from "lucide-react";
import { NowPlaying, QueueList, RequestModal } from "@/components/features";
import { GlassCard, GlowButton } from "@/components/ui";
import { useNowPlaying, useQueue, useQueueStats, useVote, useSubmitRequest } from "@/hooks/useApi";
import { type Song, type QueueItem, UserTier, QueueStatus } from "@/types";

// Fallback mock data for when API is unavailable
const fallbackSong: Song = {
  id: 0,
  suno_song_id: "",
  suno_job_id: "",
  title: "Waiting for broadcast...",
  artist: "AI Radio",
  genre: "Various",
  style_tags: [],
  mood: null,
  duration_seconds: 0,
  audio_url: null,
  cover_image_url: null,
  original_prompt: "",
  enhanced_prompt: null,
  lyrics: null,
  is_instrumental: false,
  play_count: 0,
  total_upvotes: 0,
  total_downvotes: 0,
  created_at: new Date().toISOString(),
};

const fallbackQueueItem: QueueItem = {
  id: 0,
  user_id: 0,
  song_id: null,
  telegram_user_id: 0,
  original_prompt: "No song currently playing",
  enhanced_prompt: null,
  genre_hint: null,
  style_tags: [],
  is_instrumental: false,
  status: QueueStatus.PENDING,
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
  user: null,
};

export default function HomePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // Real API hooks
  const { data: nowPlaying, isLoading: nowPlayingLoading, error: nowPlayingError } = useNowPlaying();
  const { data: queueItems, isLoading: queueLoading, error: queueError } = useQueue();
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const voteMutation = useVote();
  const submitMutation = useSubmitRequest();

  // Extract current song and queue item from nowPlaying response
  const currentSong: Song = nowPlaying?.song ?? fallbackSong;
  const currentQueueItem: QueueItem = nowPlaying?.queue_item ?? fallbackQueueItem;
  const displayQueue: QueueItem[] = queueItems ?? [];

  const handleVote = (itemId: number, type: "up" | "down") => {
    // TODO: Get actual user ID from auth context
    const userId = 1;
    voteMutation.mutate({
      queueItemId: itemId,
      voteType: type === "up" ? "upvote" : "downvote",
      userId,
    });
  };

  const handleSubmitRequest = async (data: {
    prompt: string;
    genre: string | null;
    isInstrumental: boolean;
    styleTags: string[];
  }) => {
    await submitMutation.mutateAsync(data);
  };

  // Track playback time
  useEffect(() => {
    if (!isPlaying || !currentSong.duration_seconds) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= currentSong.duration_seconds) return 0;
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSong.duration_seconds]);

  // Reset time when song changes
  useEffect(() => {
    setCurrentTime(0);
  }, [currentSong.id]);

  // Calculate stats from API data
  const queueCount = displayQueue.length;
  const generatedToday = stats?.generated_today ?? 0;
  const avgWaitMinutes = stats?.avg_wait_minutes ?? 0;
  const listeners = stats?.active_listeners ?? 0;

  // Show loading state
  const isLoading = nowPlayingLoading || queueLoading;

  return (
    <div className="space-y-8">
      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Listeners"
          value={statsLoading ? "..." : listeners.toLocaleString()}
          color="cyan"
        />
        <StatCard
          icon={<Music className="w-5 h-5" />}
          label="In Queue"
          value={queueLoading ? "..." : queueCount.toString()}
          color="violet"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Generated Today"
          value={statsLoading ? "..." : generatedToday.toString()}
          color="pink"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Wait"
          value={statsLoading ? "..." : `~${Math.round(avgWaitMinutes)} min`}
          color="orange"
        />
      </motion.div>

      {/* Now Playing section */}
      {nowPlayingLoading ? (
        <GlassCard className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-text-muted">Loading now playing...</span>
        </GlassCard>
      ) : (
        <NowPlaying
          song={currentSong}
          queueItem={currentQueueItem}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onVote={(type) => currentQueueItem.id && handleVote(currentQueueItem.id, type)}
          onSeek={setCurrentTime}
        />
      )}

      {/* Request button (mobile) */}
      <div className="lg:hidden">
        <GlowButton
          onClick={() => setIsRequestModalOpen(true)}
          className="w-full"
          size="lg"
          leftIcon={<Sparkles className="w-5 h-5" />}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : "Request a Song"}
        </GlowButton>
      </div>

      {/* Queue section */}
      {queueLoading ? (
        <GlassCard className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-text-muted">Loading queue...</span>
        </GlassCard>
      ) : (
        <QueueList
          items={displayQueue}
          onVote={handleVote}
          currentItemId={currentQueueItem?.id}
        />
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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "cyan" | "violet" | "pink" | "orange";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400",
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-400",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400",
  };

  return (
    <GlassCard noAnimation className={`bg-gradient-to-br ${colors[color]} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`${colors[color].split(" ").pop()}`}>{icon}</div>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </GlassCard>
  );
}
