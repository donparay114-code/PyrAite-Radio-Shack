"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useChatHistory, useSendMessage } from "./useApi";
import { toast } from "sonner";
import { ChatMessage } from "@/lib/supabase";

// Notification sound as base64 (subtle pop sound)
const NOTIFICATION_SOUND_BASE64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZN4JvPAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1BkIY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

// Helper to get or create anon session ID synchronously (avoids race condition)
function getAnonSessionId(): string | null {
  if (typeof window === "undefined") return null;
  let anonId = localStorage.getItem("anon_session_id");
  if (!anonId) {
    anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("anon_session_id", anonId);
  }
  return anonId;
}

export function useChat(userId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [lastRejection, setLastRejection] = useState<{
    message: string;
    reason: string;
    isWarning: boolean;
    warningsLeft?: number;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
      audioRef.current.volume = 0.3;
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Play notification sound for new messages from others
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors (user hasn't interacted yet)
      });
    }
  }, [soundEnabled]);

  // Fetch initial history
  const { data: history, isLoading: isHistoryLoading } = useChatHistory();
  const sendMessageMutation = useSendMessage();

  // Initialize messages from history
  useEffect(() => {
    if (history?.messages) {
      setMessages(history.messages);
    }
  }, [history]);

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Chat socket connected");
      setIsConnecting(false);
      setConnectionError(null);
    });

    socket.on("disconnect", () => {
      console.log("Chat socket disconnected");
      setIsConnecting(true);
    });

    // Handle new chat messages
    socket.on("chat_message", (message: ChatMessage) => {
      console.log("New chat message:", message.id);
      setMessages((prev) => {
        // Check if we already have this message (avoid duplicates)
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Play notification sound for messages from others (not our own)
      if (message.user_id !== userId) {
        playNotificationSound();
      }
    });

    // Handle message deletions
    socket.on("chat_delete", (data: { id: number }) => {
      console.log("Chat message deleted:", data.id);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id
            ? { ...msg, is_deleted: true, content: "[Message deleted]" }
            : msg
        )
      );
    });

    // Handle message updates
    socket.on("chat_update", (message: ChatMessage) => {
      console.log("Chat message updated:", message.id);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? message : msg))
      );
    });

    socket.on("connect_error", (error) => {
      console.error("Chat socket connection error:", error);
      setIsConnecting(false);
      setConnectionError(error.message || "Connection failed");
      toast.error("Joined chat failed: " + (error.message || "Connection error"));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, playNotificationSound]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        // Get session ID synchronously at send time (avoids race condition)
        const sessionId = !userId ? getAnonSessionId() : null;
        await sendMessageMutation.mutateAsync({
          content,
          userId: userId || undefined,
          anonSessionId: sessionId || undefined,
        });
        // Socket.IO will broadcast the new message to all clients including us
        // Clear any previous blocking error on successful send
        if (blockingError) {
          setBlockingError(null);
        }
      } catch (error: unknown) {
        // Extract error details from axios-style response
        const err = error as {
          response?: {
            status?: number;
            data?: {
              detail?: string | { error?: string; reason?: string; category?: string };
              reason?: string;
            }
          }
        };
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;

        // Check if this is a 403 Forbidden error (user is blocked)
        if (status === 403) {
          const reason = typeof detail === 'string'
            ? detail
            : err.response?.data?.reason || "You have been blocked from chat";
          setBlockingError(reason);
          toast.error("You are blocked from chat");
        }
        // Check if this is a 400 Bad Request (content moderation/warning)
        else if (status === 400 && detail) {
          if (typeof detail === 'object') {
            // Warning (authenticated users, 1-4 violations)
            if (detail.error === 'content_warning') {
              const warningsLeft = (detail as { warnings_until_ban?: number }).warnings_until_ban || 0;
              const reason = detail.reason || "Message violates guidelines";
              setLastRejection({
                message: content,
                reason,
                isWarning: true,
                warningsLeft,
              });
              toast.warning(`Warning: ${reason}. ${warningsLeft} warning${warningsLeft !== 1 ? 's' : ''} until ban.`, {
                duration: 6000,
              });
            }
            // Hard rejection (anonymous users)
            else if (detail.error === 'content_moderation_failed') {
              const reason = detail.reason || "Message was rejected";
              setLastRejection({
                message: content,
                reason,
                isWarning: false,
              });
              toast.error(`Message rejected: ${reason}`);
            }
            else {
              toast.error("Invalid message");
            }
          } else {
            const message = typeof detail === 'string' ? detail : "Invalid message";
            toast.error(message);
          }
        }
        else {
          toast.error("Failed to send message");
        }
      }
    },
    [userId, sendMessageMutation, blockingError]
  );

  const clearRejection = useCallback(() => setLastRejection(null), []);

  return {
    messages,
    isLoading: isHistoryLoading,
    isConnecting: isConnecting && !history,
    connectionError,
    blockingError,
    lastRejection,
    clearRejection,
    sendMessage,
    isSending: sendMessageMutation.isPending,
    soundEnabled,
    setSoundEnabled,
  };
}
