// User Types
export interface User {
  id: string;
  platform: 'telegram' | 'whatsapp';
  platformUserId: string;
  username?: string;
  displayName?: string;
  reputationScore: number;
  isPremium: boolean;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  subscriptionExpiresAt?: Date;
  totalRequests: number;
  successfulPlays: number;
  createdAt: Date;
  lastActive: Date;
}

// Channel Types
export interface RadioChannel {
  id: string;
  channelType: 'public' | 'private';
  name: string;
  slug: string;
  genre?: string;
  description?: string;
  icecastMount: string;
  hlsPath: string;
  streamUrl?: string;
  ownerUserId?: string;
  isActive: boolean;
  requiresApproval: boolean;
  maxQueueSize: number;
  aiModerationEnabled: boolean;
  moderationStrictness: 'low' | 'medium' | 'high';
  allowExplicitLyrics: boolean;
  customModerationPrompt?: string;
  listenerCount: number;
  totalPlays: number;
  createdAt: Date;
}

// Channel Membership
export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  canSubmit: boolean;
  joinedAt: Date;
}

// Song Request Types
export interface SongRequest {
  id: string;
  channelId: string;
  userId: string;
  prompt: string;
  detectedGenre?: string;
  customTitle?: string;
  customStyleTags?: string;
  sunoTaskId?: string;
  sunoClipId?: string;
  audioUrl?: string;
  durationSeconds?: number;
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed';
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'bypassed';
  moderationReason?: string;
  moderationScore?: ModerationScore;
  moderationBypassed: boolean;
  bypassedByUserId?: string;
  queueStatus: 'queued' | 'playing' | 'played' | 'skipped';
  basePriority: number;
  calculatedPriority?: number;
  requestedAt: Date;
  moderatedAt?: Date;
  queuedAt?: Date;
  playedAt?: Date;
}

// Moderation Types
export interface ModerationScore {
  promptInjection: boolean;
  openaiCategories?: string[];
  claudeAnalysis?: {
    approved: boolean;
    reason?: string;
    concerns?: string[];
    severity?: 'low' | 'medium' | 'high';
  };
  blockedWords?: string[];
}

export interface BlockedContent {
  id: string;
  channelId?: string;
  word: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRegex: boolean;
  addedBy?: string;
  addedAt: Date;
}

export interface UserViolation {
  id: string;
  userId: string;
  channelId?: string;
  violationType: string;
  details?: string;
  timeoutUntil?: Date;
  createdAt: Date;
}

export interface ModerationAuditLog {
  id: string;
  requestId: string;
  moderatorId?: string;
  action: 'bypass_approval' | 'force_reject' | 'settings_change';
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  createdAt: Date;
}

// Now Playing
export interface NowPlaying {
  id: string;
  channelId: string;
  songRequestId: string;
  startedAt: Date;
  endsAt?: Date;
  listenerCount: number;
  title?: string;
  username?: string;
  artwork?: string;
  duration?: number;
}

// Rate Limiting
export interface RateLimit {
  id: string;
  userId: string;
  channelId: string;
  windowStart: Date;
  requestCount: number;
  dailyLimit: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Queue Priority Calculation
export interface QueuePriorityFactors {
  waitBonus: number;
  repBonus: number;
  premiumBonus: number;
  recentPenalty: number;
  calculatedPriority: number;
}

// Socket Events
export interface SocketEvents {
  'now-playing': NowPlaying;
  'queue-update': SongRequest[];
  'listener-count': number;
  'moderation-settings-changed': {
    type: string;
    message: string;
  };
}

// Suno API Types
export interface SunoGenerationRequest {
  prompt: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
  model?: string;
  title?: string;
  tags?: string;
}

export interface SunoGenerationResponse {
  id: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  title?: string;
  tags?: string;
  duration?: number;
  error_message?: string;
}

// Genre Classification
export type Genre =
  | 'Rap'
  | 'Jazz'
  | 'Lo-Fi'
  | 'Electronic'
  | 'Rock'
  | 'Classical'
  | 'Indie'
  | 'Pop'
  | 'Country'
  | 'R&B'
  | 'Reggae'
  | 'Metal'
  | 'Other';

// Design Tokens (for use in components)
export interface DesignTokens {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    brand: {
      primary: string;
      primaryHover: string;
    };
    genres: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}
