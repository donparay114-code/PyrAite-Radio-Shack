// User types
export interface User {
  id: number;
  telegram_id: number | null;
  telegram_username: string | null;
  username?: string | null; // Keep for compatibility if needed, or remove
  email?: string | null;
  google_id?: string | null;
  display_name: string | null;
  reputation_score: number;
  tier: UserTier;
  total_requests: number;
  successful_requests: number;
  success_rate?: number;
  total_upvotes_received: number;
  total_downvotes_received: number;
  total_upvotes_given?: number;
  total_downvotes_given?: number;
  is_banned: boolean;
  is_premium: boolean;
  created_at: string;
}

export enum UserTier {
  NEW = "new",
  REGULAR = "regular",
  TRUSTED = "trusted",
  VIP = "vip",
  ELITE = "elite",
}

export const TIER_COLORS: Record<UserTier, string> = {
  [UserTier.NEW]: "#71717a",
  [UserTier.REGULAR]: "#22c55e",
  [UserTier.TRUSTED]: "#3b82f6",
  [UserTier.VIP]: "#8b5cf6",
  [UserTier.ELITE]: "#f59e0b",
};

export const TIER_LABELS: Record<UserTier, string> = {
  [UserTier.NEW]: "New",
  [UserTier.REGULAR]: "Regular",
  [UserTier.TRUSTED]: "Trusted",
  [UserTier.VIP]: "VIP",
  [UserTier.ELITE]: "Elite",
};

// Song types
export interface Song {
  id: number;
  suno_song_id: string | null;
  suno_job_id: string | null;
  title: string;
  artist: string | null;
  genre: string | null;
  style_tags: string[];
  mood: string | null;
  duration_seconds: number | null;
  audio_url: string | null;
  cover_image_url: string | null;
  original_prompt: string;
  enhanced_prompt: string | null;
  lyrics: string | null;
  is_instrumental: boolean;
  play_count: number;
  total_upvotes: number;
  total_downvotes: number;
  created_at: string;
}

// Queue types
export interface QueueItem {
  id: number;
  user_id: number | null;
  song_id: number | null;
  telegram_user_id: number | null;
  original_prompt: string;
  enhanced_prompt: string | null;
  genre_hint: string | null;
  style_tags: string[];
  is_instrumental: boolean;
  status: QueueStatus;
  priority_score: number;
  base_priority: number;
  upvotes: number;
  downvotes: number;
  suno_job_id: string | null;
  error_message: string | null;
  retry_count: number;
  requested_at: string;
  queued_at: string | null;
  generation_started_at: string | null;
  generation_completed_at: string | null;
  broadcast_started_at: string | null;
  completed_at: string | null;
  // Joined data
  user?: User;
  song?: Song;
}

export enum QueueStatus {
  PENDING = "pending",
  MODERATION = "moderation",
  QUEUED = "queued",
  GENERATING = "generating",
  GENERATED = "generated",
  READY = "ready",
  BROADCASTING = "broadcasting",
  COMPLETED = "completed",
  FAILED = "failed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export const STATUS_COLORS: Record<QueueStatus, string> = {
  [QueueStatus.PENDING]: "#71717a",
  [QueueStatus.MODERATION]: "#f59e0b",
  [QueueStatus.QUEUED]: "#3b82f6",
  [QueueStatus.GENERATING]: "#8b5cf6",
  [QueueStatus.GENERATED]: "#22c55e",
  [QueueStatus.READY]: "#22c55e",
  [QueueStatus.BROADCASTING]: "#ef4444",
  [QueueStatus.COMPLETED]: "#22c55e",
  [QueueStatus.FAILED]: "#ef4444",
  [QueueStatus.REJECTED]: "#ef4444",
  [QueueStatus.CANCELLED]: "#71717a",
};

export const STATUS_LABELS: Record<QueueStatus, string> = {
  [QueueStatus.PENDING]: "Pending",
  [QueueStatus.MODERATION]: "In Review",
  [QueueStatus.QUEUED]: "Queued",
  [QueueStatus.GENERATING]: "Generating",
  [QueueStatus.GENERATED]: "Generated",
  [QueueStatus.READY]: "Ready",
  [QueueStatus.BROADCASTING]: "On Air",
  [QueueStatus.COMPLETED]: "Completed",
  [QueueStatus.FAILED]: "Failed",
  [QueueStatus.REJECTED]: "Rejected",
  [QueueStatus.CANCELLED]: "Cancelled",
};

/** Icon names for each queue status (component mapping done in UI layer) */
export const STATUS_ICON_NAMES: Record<QueueStatus, string> = {
  [QueueStatus.PENDING]: "Clock",
  [QueueStatus.MODERATION]: "AlertCircle",
  [QueueStatus.QUEUED]: "Music",
  [QueueStatus.GENERATING]: "Sparkles",
  [QueueStatus.GENERATED]: "CheckCircle2",
  [QueueStatus.READY]: "CheckCircle2",
  [QueueStatus.BROADCASTING]: "Radio",
  [QueueStatus.COMPLETED]: "CheckCircle2",
  [QueueStatus.FAILED]: "XCircle",
  [QueueStatus.REJECTED]: "XCircle",
  [QueueStatus.CANCELLED]: "XCircle",
};

// Vote types
export interface Vote {
  id: number;
  user_id: number;
  queue_item_id: number | null;
  song_id: number | null;
  vote_type: VoteType;
  created_at: string;
}

export enum VoteType {
  UPVOTE = "upvote",
  DOWNVOTE = "downvote",
}

// API response types
export interface QueueStats {
  pending: number;
  generating: number;
  ready: number;
  broadcasting: number;
  completed_today: number;
  average_wait_time: number;
}

export interface NowPlaying {
  queue_item: QueueItem | null;
  song: Song | null;
  started_at: string | null;
  progress_seconds: number;
  listeners: number;
}

export interface Leaderboard {
  users: LeaderboardEntry[];
  period: "daily" | "weekly" | "monthly" | "all_time";
}

// Type alias for socket events
export type SongRequest = QueueItem;

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  requests: number;
  upvotes: number;
}
