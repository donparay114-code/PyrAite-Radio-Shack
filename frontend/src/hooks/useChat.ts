"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useChatHistory, useSendMessage } from "./useApi";
import { toast } from "sonner";

// Chat message type matching backend response
export interface ChatMessage {
  id: number;
  user_id: number | null;
  user_display_name: string | null;
  user_tier: string | null;
  content: string;
  message_type: string;
  reply_to_id: number | null;
  is_deleted: boolean;
  created_at: string;
}

export function useChat(userId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const socketRef = useRef<Socket | null>(null);

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
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessageMutation.mutateAsync({
          content,
          userId: userId || undefined,
        });
        // Socket.IO will broadcast the new message to all clients including us
      } catch {
        toast.error("Failed to send message");
      }
    },
    [userId, sendMessageMutation]
  );

  return {
    messages,
    isLoading: isHistoryLoading,
    isConnecting: isConnecting && !history,
    sendMessage,
    isSending: sendMessageMutation.isPending,
  };
}
