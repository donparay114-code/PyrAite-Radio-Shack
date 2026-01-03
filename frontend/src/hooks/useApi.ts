"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueItem, Song, User, QueueStats, NowPlaying, Leaderboard } from "@/types";
import type { ChatMessage } from "@/lib/supabase";


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Get auth token from localStorage (set by AuthProvider)
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // Add auth header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));

    // Log detailed error for debugging
    console.error(`API Error [${res.status}] ${endpoint}:`, error);

    // Handle specific error codes
    if (res.status === 401) {
      // Clear invalid token
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }
      throw new ApiError(401, "Authentication required. Please log in.");
    }

    if (res.status === 422) {
      const validationErrors = error.detail;
      const message = Array.isArray(validationErrors)
        ? validationErrors.map((e: { msg: string }) => e.msg).join(", ")
        : error.detail || "Validation error";
      throw new ApiError(422, message);
    }

    throw new ApiError(res.status, error.detail || error.error || "Request failed");
  }

  return res.json();
}

// Queue hooks
export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: () => fetchApi<QueueItem[]>("/api/queue/"),
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue", "stats"],
    queryFn: () => fetchApi<QueueStats>("/api/queue/stats"),
    refetchInterval: 10000,
  });
}

export function useNowPlaying() {
  return useQuery({
    queryKey: ["nowPlaying"],
    queryFn: () => fetchApi<NowPlaying>("/api/queue/now-playing"),
    refetchInterval: 3000,
  });
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      prompt: string;
      genre: string | null;
      isInstrumental: boolean;
      styleTags: string[];
      telegramUserId?: number;
      userId?: number;
    }) =>
      fetchApi<QueueItem>("/api/queue/", {
        method: "POST",
        body: JSON.stringify({
          original_prompt: data.prompt,
          genre_hint: data.genre,
          is_instrumental: data.isInstrumental,
          style_tags: data.styleTags,
          telegram_user_id: data.telegramUserId,
          user_id: data.userId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

// Vote hooks
export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { queueItemId: number; voteType: "upvote" | "downvote"; userId: number }) =>
      fetchApi("/api/votes/", {
        method: "POST",
        body: JSON.stringify({
          queue_item_id: data.queueItemId,
          vote_type: data.voteType,
          user_id: data.userId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["nowPlaying"] });
    },
  });
}

// User hooks
export function useUser(userId: number) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchApi<User>(`/api/users/${userId}`),
    enabled: !!userId,
  });
}

export function useLeaderboard(period: "daily" | "weekly" | "monthly" | "all_time" = "weekly") {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fetchApi<Leaderboard>(`/api/users/leaderboard?period=${period}`),
  });
}

export function useUserRequests(userId: number) {
  return useQuery({
    queryKey: ["userRequests", userId],
    queryFn: () => fetchApi<QueueItem[]>(`/api/queue/?user_id=${userId}`),
    enabled: !!userId,
  });
}

export function useLinkTelegram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { telegramUsername: string; userId: number }) =>
      fetchApi(`/api/auth/link-telegram?user_id=${data.userId}`, {
        method: "POST",
        body: JSON.stringify({ telegram_username: data.telegramUsername })
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
    }
  });
}

// Song hooks
export function useSongs(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["songs", page, limit],
    queryFn: () =>
      fetchApi<{ songs: Song[]; total: number; page: number; limit: number }>(
        `/api/songs/?page=${page}&limit=${limit}`
      ),
  });
}

/**
 * Search result containing songs, users, and queue items matching the query
 */
export interface SearchResult {
  songs: Song[];
  users: User[];
  queue_items: QueueItem[];
}

/**
 * Search across songs, users, and queue items
 * @param query - Search query string (minimum 2 characters)
 * @param enabled - Whether the query should execute (default: true)
 * @returns Query result with songs, users, and queue_items arrays
 * @example
 * const { data, isLoading } = useSearch(debouncedQuery, isSearchOpen);
 * // Results cached for 30 seconds
 */
export function useSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchApi<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useSong(songId: number) {
  return useQuery({
    queryKey: ["song", songId],
    queryFn: () => fetchApi<Song>(`/api/songs/${songId}`),
    enabled: !!songId,
  });
}

// ============================================================================
// Admin Hooks
// ============================================================================

/**
 * Fetch admin dashboard statistics
 * @returns Query with total users, songs, requests, queue size, and API costs
 * @example
 * const { data: stats, isLoading } = useAdminStats();
 * // Refetches every 30 seconds
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () =>
      fetchApi<{
        total_users: number;
        total_songs: number;
        total_requests: number;
        active_queue: number;
        daily_requests: number;
        api_costs: {
          suno: number;
          openai: number;
          total: number;
        };
      }>("/api/admin/stats"),
    refetchInterval: 30000,
  });
}

/**
 * System health status for all services
 */
export interface SystemHealth {
  api: { status: string; latency: number };
  database: { status: string; latency: number };
  redis: { status: string; latency: number };
  suno: { status: string; latency: number };
  liquidsoap: { status: string; uptime: string };
  icecast: { status: string; listeners: number };
}

/**
 * Fetch system health status for all services
 * @returns Query with health status for API, database, Redis, Suno, Liquidsoap, Icecast
 * @example
 * const { data: health } = useSystemHealth();
 * // Status can be "healthy", "degraded", or "unhealthy"
 * // Refetches every 15 seconds
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => fetchApi<SystemHealth>("/api/admin/health"),
    refetchInterval: 15000,
  });
}

/**
 * Recent activity item for activity feed
 */
export interface RecentActivity {
  /** Activity type: "request", "generation", "broadcast", "moderation", "vote" */
  type: string;
  /** Username who performed the action */
  user?: string;
  /** Song title if relevant */
  song?: string;
  /** Action description */
  action?: string;
  /** Status (e.g., "completed", "started") */
  status?: string;
  /** Relative time (e.g., "2m ago") */
  time: string;
}

/**
 * Fetch recent activity feed for admin dashboard
 * @param limit - Maximum number of items to fetch (default: 10)
 * @returns Query with array of recent activities
 * @example
 * const { data: activity } = useRecentActivity(5);
 * // Refetches every 10 seconds
 */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ["admin", "activity", limit],
    queryFn: () => fetchApi<RecentActivity[]>(`/api/admin/activity?limit=${limit}`),
    refetchInterval: 10000,
  });
}

/**
 * Today's statistics including hourly breakdown
 */
export interface TodayStats {
  /** Total requests today */
  requests: number;
  /** Success rate as decimal (0.94 = 94%) */
  success_rate: number;
  /** Peak concurrent listeners */
  peak_listeners: number;
  /** Average wait time formatted (e.g., "2.3m") */
  avg_wait_time: string;
  /** Hourly request counts (24 elements, index 0 = midnight) */
  hourly_data: number[];
}

/**
 * Fetch today's statistics with hourly breakdown
 * @returns Query with today's metrics and hourly data for charts
 * @example
 * const { data: today } = useTodayStats();
 * // hourly_data[14] = requests at 2 PM
 * // Refetches every 30 seconds
 */
export function useTodayStats() {
  return useQuery({
    queryKey: ["admin", "today"],
    queryFn: () => fetchApi<TodayStats>("/api/admin/today"),
    refetchInterval: 30000,
  });
}

// Chat hooks
export function useChatHistory(limit = 50) {
  return useQuery({
    queryKey: ["chat", "history"],
    queryFn: () => fetchApi<{ messages: ChatMessage[]; total: number; has_more: boolean }>(`/api/chat/?limit=${limit}`),
    staleTime: Infinity, // History doesn't change, we rely on realtime for updates
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; replyToId?: number; userId: number }) =>
      fetchApi<ChatMessage>(`/api/chat/?user_id=${data.userId}`, {
        method: "POST",
        body: JSON.stringify({
          content: data.content,
          reply_to_id: data.replyToId,
        }),
      }),
    // optimistic updates handled in useChat
  });
}

export function useDeleteMessage() {
  return useMutation({
    mutationFn: (data: { messageId: number; moderatorId: number; reason?: string }) =>
      fetchApi(`/api/chat/${data.messageId}?moderator_id=${data.moderatorId}&reason=${data.reason || "Moderation"}`, {
        method: "DELETE",
      }),
  });
}
