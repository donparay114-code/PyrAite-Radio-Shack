"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Users, Music, Clock, MessageCircle, User, ChevronRight, Send } from "lucide-react";
import { NowPlaying, QueueList, RequestModal, Chat } from "@/components/features";
import {
  GlassCard,
  GlowButton,
  Skeleton,
  StaggerContainer,
  StaggerItem,
  PulseGlow,
  Avatar,
  Badge,
  easings,
} from "@/components/ui";
import { useNowPlaying, useQueue, useQueueStats, useVote, useSubmitRequest } from "@/hooks/useApi";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/AuthProvider";
import { cn, formatTimeAgo } from "@/lib/utils";
import { type Song, type QueueItem, UserTier, QueueStatus, TIER_LABELS } from "@/types";

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
  user: undefined,
};

export default function HomePage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // Auth context
  const { user, isAuthenticated } = useAuth();

  // Real API hooks
  const { data: nowPlaying, isLoading: nowPlayingLoading, error: nowPlayingError } = useNowPlaying();
  const { data: queueItems, isLoading: queueLoading, error: queueError } = useQueue();
  const { data: stats, isLoading: statsLoading } = useQueueStats();
  const voteMutation = useVote();
  const submitMutation = useSubmitRequest();

  // Chat hook - pass user ID for authenticated users
  const { messages: chatMessages, isLoading: chatLoading, sendMessage, isSending } = useChat(user?.id);

  // Extract current song and queue item from nowPlaying response
  const currentSong: Song = nowPlaying?.song ?? fallbackSong;
  const currentQueueItem: QueueItem = nowPlaying?.queue_item ?? fallbackQueueItem;
  const displayQueue: QueueItem[] = queueItems ?? [];

  const handleVote = (itemId: number, type: "up" | "down") => {
    // Use authenticated user ID, fallback to 1 for unauthenticated users
    const userId = user?.id ?? 1;
    if (!isAuthenticated) {
      console.warn("User not authenticated, using guest mode for voting");
    }
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

  // Reset time when song changes
  useEffect(() => {
    setCurrentTime(0);
  }, [currentSong.id]);

  // Calculate stats from API data
  const queueCount = displayQueue.length;
  const generatedToday = stats?.completed_today ?? 0;
  const avgWaitMinutes = stats?.average_wait_time ?? 0;
  const listeners = nowPlaying?.listeners ?? 0;

  // Show loading state
  const isLoading = nowPlayingLoading || queueLoading;

  return (
    <div className="relative">
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <PulseGlow color="#8b5cf6" size="lg" className="-top-32 -left-32" intensity={0.15} />
        <PulseGlow color="#06b6d4" size="lg" className="-bottom-32 -right-32" intensity={0.15} />
      </div>

      {/* Main grid layout - Chat on left (wider), Player/Queue on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Sidebar with Chat - visible on lg screens - LEFT SIDE */}
        <motion.div
          className="hidden lg:flex flex-col gap-6 h-[calc(100vh-6rem)] sticky top-24"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: easings.smooth }}
        >
          {/* Profile Quick Access */}
          <ProfileWidget user={user} isAuthenticated={isAuthenticated} />

          {/* Chat - Fills remaining height */}
          <div id="chat-section" className="flex-1 flex flex-col min-h-0">
            <Chat
              messages={chatMessages}
              isLoading={chatLoading}
              onSendMessage={sendMessage}
              isSending={isSending}
              currentUser={user}
              isAuthenticated={isAuthenticated}
              maxHeight="calc(100vh - 400px)"
              className="h-full"
            />
          </div>
        </motion.div>

        {/* Main content - fills remaining space - RIGHT SIDE */}
        <div className="space-y-8">
          {/* Stats bar with staggered animation */}
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4" staggerDelay={0.1}>
            <StaggerItem>
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Listeners"
                value={statsLoading ? "..." : listeners.toLocaleString()}
                color="cyan"
                isLoading={statsLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={<Music className="w-5 h-5" />}
                label="In Queue"
                value={queueLoading ? "..." : queueCount.toString()}
                color="violet"
                isLoading={queueLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={<Sparkles className="w-5 h-5" />}
                label="Generated Today"
                value={statsLoading ? "..." : generatedToday.toString()}
                color="pink"
                isLoading={statsLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Avg Wait"
                value={statsLoading ? "..." : `~${Math.round(avgWaitMinutes)} min`}
                color="orange"
                isLoading={statsLoading}
              />
            </StaggerItem>
          </StaggerContainer>

          {/* Now Playing section - Full Width */}
          {nowPlayingLoading ? (
            <NowPlayingSkeleton />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: easings.smooth }}
            >
              <NowPlaying
                song={currentSong}
                queueItem={currentQueueItem}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onVote={(type) => currentQueueItem.id && handleVote(currentQueueItem.id, type)}
                onSeek={setCurrentTime}
              />
            </motion.div>
          )}

          {/* Request button (mobile) with sleek hover */}
          <motion.div
            className="lg:hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <GlowButton
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full"
              size="lg"
              leftIcon={<Sparkles className="w-5 h-5" />}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Request a Song"}
            </GlowButton>
          </motion.div>

          {/* Queue section with sleek skeleton loader */}
          {queueLoading ? (
            <QueueSkeleton />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: easings.smooth }}
            >
              <QueueList
                items={displayQueue}
                onVote={handleVote}
                currentItemId={currentQueueItem?.id}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Profile Link */}
      <motion.div
        className="lg:hidden mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: easings.smooth }}
      >
        <Link href="/profile">
          <GlassCard className="p-4 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Your Profile</p>
                <p className="text-xs text-text-muted">
                  {isAuthenticated ? user?.tier || "View stats" : "Sign in"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </GlassCard>
        </Link>
      </motion.div>

      {/* Mobile Chat Section */}
      <motion.div
        className="lg:hidden mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: easings.smooth }}
      >
        <Chat
          messages={chatMessages}
          isLoading={chatLoading}
          onSendMessage={sendMessage}
          isSending={isSending}
          currentUser={user}
          isAuthenticated={isAuthenticated}
          maxHeight="400px"
        />
      </motion.div>

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
  isLoading?: boolean;
}

function StatCard({ icon, label, value, color, isLoading }: StatCardProps) {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400",
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-400",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ duration: 0.2, ease: easings.snappy }}
    >
      <GlassCard noAnimation className={`bg-gradient-to-br ${colors[color]} p-4`}>
        <div className="flex items-center gap-3">
          <div className={`${colors[color].split(" ").pop()}`}>{icon}</div>
          <div>
            <p className="text-xs text-text-muted">{label}</p>
            {isLoading ? (
              <Skeleton variant="text" className="h-7 w-16 mt-0.5" />
            ) : (
              <p className="text-lg font-bold text-white">{value}</p>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Sleek skeleton loader for Now Playing section
function NowPlayingSkeleton() {
  return (
    <GlassCard className="p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Album art skeleton */}
        <Skeleton variant="rounded" className="w-full lg:w-80 aspect-square" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <Skeleton variant="text" className="h-8 w-3/4" />
            <Skeleton variant="text" className="h-5 w-1/2" />
            <div className="flex gap-2 mt-4">
              <Skeleton variant="rounded" className="h-6 w-16" />
              <Skeleton variant="rounded" className="h-6 w-20" />
            </div>
          </div>

          {/* Visualizer skeleton */}
          <div className="flex items-end justify-center gap-1 h-20">
            {Array.from({ length: 32 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                className="w-1.5 rounded-full"
                height={`${Math.random() * 60 + 20}%`}
              />
            ))}
          </div>

          {/* Progress skeleton */}
          <Skeleton variant="rounded" className="h-2 w-full" />

          {/* Controls skeleton */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Skeleton variant="rounded" className="h-10 w-20" />
              <Skeleton variant="rounded" className="h-10 w-20" />
            </div>
            <Skeleton variant="circular" className="h-14 w-14" />
            <div className="flex gap-2">
              <Skeleton variant="circular" className="h-10 w-10" />
              <Skeleton variant="circular" className="h-10 w-10" />
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// Sleek skeleton loader for Queue section
function QueueSkeleton() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" className="h-6 w-32" />
        <Skeleton variant="rounded" className="h-6 w-16" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, ease: easings.smooth }}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
          >
            <Skeleton variant="text" className="h-6 w-6" />
            <Skeleton variant="circular" className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rounded" className="h-8 w-14" />
              <Skeleton variant="rounded" className="h-8 w-14" />
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// Profile Quick Access Widget
interface ProfileWidgetProps {
  user: {
    id: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
    tier?: UserTier;
    reputation_score?: number;
  } | null;
  isAuthenticated: boolean;
}

function ProfileWidget({ user, isAuthenticated }: ProfileWidgetProps) {
  return (
    <Link href="/profile">
      <GlassCard className="p-4 hover:bg-white/10 transition-colors cursor-pointer group">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-sm font-medium text-white">Your Profile</span>
          <ChevronRight className="w-4 h-4 text-text-muted ml-auto group-hover:translate-x-1 transition-transform" />
        </div>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <Avatar
              name={user.firstName || user.username || "User"}
              src={user.photoUrl}
              size="md"
              tier={user.tier}
              showTierBorder
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName || user.username || "Anonymous"}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="violet" size="sm">
                  {user.tier ? TIER_LABELS[user.tier] : "NEW"}
                </Badge>
                {user.reputation_score !== undefined && (
                  <span className="text-xs text-text-muted">
                    {user.reputation_score.toLocaleString()} rep
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-text-muted">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <p className="text-sm">Sign in with Telegram</p>
          </div>
        )}
      </GlassCard>
    </Link>
  );
}

