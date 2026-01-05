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

  // Handle empty responses (204 No Content or empty body)
  const contentType = res.headers.get("content-type");
  if (res.status === 204 || !contentType?.includes("application/json")) {
    return {} as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
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
      fetchApi(`/api/auth/google/link-telegram`, {
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
    mutationFn: (data: { content: string; replyToId?: number; userId?: number; anonSessionId?: string }) => {
      // Build query string with user_id and/or anon_session_id
      const params = new URLSearchParams();
      if (data.userId) {
        params.append("user_id", data.userId.toString());
      }
      if (data.anonSessionId && !data.userId) {
        // Only send anon session ID for anonymous users
        params.append("anon_session_id", data.anonSessionId);
      }
      const queryParams = params.toString() ? `?${params.toString()}` : "";
      console.log("[DEBUG useApi] Sending chat message:", {
        userId: data.userId,
        anonSessionId: data.anonSessionId,
        url: `/api/chat/${queryParams}`
      });
      return fetchApi<ChatMessage>(`/api/chat/${queryParams}`, {
        method: "POST",
        body: JSON.stringify({
          content: data.content,
          reply_to_id: data.replyToId,
        }),
      });
    },
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

// Profile update hooks
export function useUpdateEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { new_email: string; password: string }) =>
      fetchApi<{ success: boolean; message: string; email: string }>("/api/profile/email", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      fetchApi<{ success: boolean; message: string }>("/api/profile/password", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  });
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { new_password: string }) =>
      fetchApi<{ success: boolean; message: string }>("/api/profile/set-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateUsername() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { new_username: string }) =>
      fetchApi<{
        success: boolean;
        message: string;
        display_name: string;
        username_last_changed_at: string | null;
        days_until_next_change: number;
      }>("/api/profile/username", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new ApiError(res.status, error.detail || "Upload failed");
      }

      return res.json() as Promise<{ success: boolean; avatar_url: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchApi<{ success: boolean; message: string }>("/api/profile/avatar", {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useProfileSettings() {
  return useQuery({
    queryKey: ["profile", "settings"],
    queryFn: () =>
      fetchApi<{
        id: number;
        display_name: string;
        email: string | null;
        google_id: string | null;
        telegram_id: number | null;
        telegram_username: string | null;
        avatar_url: string | null;
        tier: string;
        reputation_score: number;
        is_premium: boolean;
        username_last_changed_at: string | null;
      }>("/api/profile/settings"),
  });
}

// Password reset hooks
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      fetchApi<{ success: boolean; message: string }>("/api/auth/email/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; new_password: string }) =>
      fetchApi<{ success: boolean; message: string }>("/api/auth/email/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
