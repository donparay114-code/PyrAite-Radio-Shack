"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueItem, Song, User, QueueStats, NowPlaying, Leaderboard } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.detail || error.error || "Request failed");
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
    }) =>
      fetchApi<QueueItem>("/api/queue/", {
        method: "POST",
        body: JSON.stringify({
          original_prompt: data.prompt,
          genre_hint: data.genre,
          is_instrumental: data.isInstrumental,
          style_tags: data.styleTags,
          telegram_user_id: data.telegramUserId,
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

export function useSong(songId: number) {
  return useQuery({
    queryKey: ["song", songId],
    queryFn: () => fetchApi<Song>(`/api/songs/${songId}`),
    enabled: !!songId,
  });
}

// Admin hooks
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
