"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users, Music, Clock } from "lucide-react";
import { NowPlaying, QueueList, RequestModal } from "@/components/features";
import { GlassCard, GlowButton, Badge } from "@/components/ui";
import { useNowPlaying, useQueue, useQueueStats, useVote, useSubmitRequest } from "@/hooks";
import { formatNumber } from "@/lib/utils";
import type { Song, QueueItem } from "@/types";

// Mock data for demo (replace with API data)
const mockSong: Song = {
  id: 1,
  suno_song_id: "abc123",
  suno_job_id: "job123",
  title: "Neon Dreams",
  artist: "AI Generated",
  genre: "Synthwave",
  style_tags: ["Retro", "Atmospheric"],
  mood: "Dreamy",
  duration_seconds: 195,
  audio_url: null,
  cover_image_url: null,
  original_prompt: "A dreamy synthwave track about summer nights",
  enhanced_prompt: null,
  lyrics: null,
  is_instrumental: false,
  play_count: 42,
  total_upvotes: 128,
  total_downvotes: 5,
  created_at: new Date().toISOString(),
};

const mockQueueItems: QueueItem[] = [
  {
    id: 1,
    user_id: 1,
    song_id: 1,
    telegram_user_id: 123456,
    original_prompt: "An energetic EDM drop with heavy bass",
    enhanced_prompt: null,
    genre_hint: "EDM",
    style_tags: ["Energetic", "Heavy"],
    is_instrumental: true,
    status: "generating",
    priority_score: 850,
    base_priority: 100,
    upvotes: 15,
    downvotes: 2,
    suno_job_id: null,
    error_message: null,
    retry_count: 0,
    requested_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    queued_at: null,
    generation_started_at: null,
    generation_completed_at: null,
    broadcast_started_at: null,
    completed_at: null,
    user: {
      id: 1,
      telegram_id: 123456,
      username: "dj_master",
      display_name: "DJ Master",
      reputation_score: 1500,
      tier: "vip",
      total_requests: 45,
      successful_requests: 42,
      total_upvotes_received: 320,
      total_downvotes_received: 15,
      is_banned: false,
      is_premium: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 2,
    user_id: 2,
    song_id: null,
    telegram_user_id: 789012,
    original_prompt: "Chill lofi beats for studying",
    enhanced_prompt: null,
    genre_hint: "Lofi",
    style_tags: ["Chill", "Relaxing"],
    is_instrumental: true,
    status: "queued",
    priority_score: 720,
    base_priority: 100,
    upvotes: 8,
    downvotes: 1,
    suno_job_id: null,
    error_message: null,
    retry_count: 0,
    requested_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    queued_at: null,
    generation_started_at: null,
    generation_completed_at: null,
    broadcast_started_at: null,
    completed_at: null,
    user: {
      id: 2,
      telegram_id: 789012,
      username: "lofi_lover",
      display_name: "Lofi Lover",
      reputation_score: 450,
      tier: "trusted",
      total_requests: 22,
      successful_requests: 20,
      total_upvotes_received: 150,
      total_downvotes_received: 8,
      is_banned: false,
      is_premium: false,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 3,
    user_id: 3,
    song_id: null,
    telegram_user_id: 345678,
    original_prompt: "Epic orchestral battle music",
    enhanced_prompt: null,
    genre_hint: "Orchestral",
    style_tags: ["Epic", "Cinematic"],
    is_instrumental: true,
    status: "pending",
    priority_score: 580,
    base_priority: 100,
    upvotes: 4,
    downvotes: 0,
    suno_job_id: null,
    error_message: null,
    retry_count: 0,
    requested_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    queued_at: null,
    generation_started_at: null,
    generation_completed_at: null,
    broadcast_started_at: null,
    completed_at: null,
    user: {
      id: 3,
      telegram_id: 345678,
      username: "epic_gamer",
      display_name: "Epic Gamer",
      reputation_score: 200,
      tier: "regular",
      total_requests: 8,
      successful_requests: 7,
      total_upvotes_received: 45,
      total_downvotes_received: 3,
      is_banned: false,
      is_premium: false,
      created_at: new Date().toISOString(),
    },
  },
];

export default function HomePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(45);

  // In production, use these hooks:
  // const { data: nowPlaying } = useNowPlaying();
  // const { data: queueItems } = useQueue();
  // const { data: stats } = useQueueStats();
  // const voteMutation = useVote();
  // const submitMutation = useSubmitRequest();

  const handleVote = (itemId: number, type: "up" | "down") => {
    console.log("Vote:", itemId, type);
    // voteMutation.mutate({ queueItemId: itemId, voteType: type, userId: 1 });
  };

  const handleSubmitRequest = async (data: {
    prompt: string;
    genre: string | null;
    isInstrumental: boolean;
    styleTags: string[];
  }) => {
    console.log("Submit:", data);
    // await submitMutation.mutateAsync(data);
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
  };

  // Simulate time progress
  useState(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentTime((prev) => (prev >= 195 ? 0 : prev + 1));
      }
    }, 1000);
    return () => clearInterval(interval);
  });

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
          value="1,234"
          color="cyan"
        />
        <StatCard
          icon={<Music className="w-5 h-5" />}
          label="In Queue"
          value="12"
          color="violet"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Generated Today"
          value="89"
          color="pink"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Wait"
          value="~3 min"
          color="orange"
        />
      </motion.div>

      {/* Now Playing section */}
      <NowPlaying
        song={mockSong}
        queueItem={mockQueueItems[0]}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onVote={(type) => handleVote(0, type)}
        onSeek={setCurrentTime}
      />

      {/* Request button (mobile) */}
      <div className="lg:hidden">
        <GlowButton
          onClick={() => setIsRequestModalOpen(true)}
          className="w-full"
          size="lg"
          leftIcon={<Sparkles className="w-5 h-5" />}
        >
          Request a Song
        </GlowButton>
      </div>

      {/* Queue section */}
      <QueueList
        items={mockQueueItems}
        onVote={handleVote}
        currentItemId={undefined}
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
