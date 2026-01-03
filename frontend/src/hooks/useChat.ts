"use strict";

import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured, type ChatMessage } from "@/lib/supabase";
import { useChatHistory, useSendMessage } from "./useApi";
import { toast } from "sonner";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

export function useChat(userId?: number) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);

  // Fetch initial history
  const { data: history, isError, isLoading: isHistoryLoading } = useChatHistory();
  const sendMessageMutation = useSendMessage();

  // Initialize messages from history
  useEffect(() => {
    if (history?.messages) {
      setMessages(history.messages);
      setIsConnecting(false);
    }
  }, [history]);

  // Subscribe to Realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Supabase not configured - realtime features disabled
      setIsConnecting(false);
      return;
    }

    const channel = supabase
      .channel("chat_room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // If we have the user ID, we can optimistically update
          // But usually we need to fetch the user details or rely on the frontend to display placeholders
          // For now, we'll just append it. To check for user details, we might want to 
          // invalidate the query or fetch the distinct message.
          // However, for immediate feedback, we verify if it's already there (optimistic update case)

          setMessages((prev) => {
            // Check if we already added this message (e.g. via optimistic update)
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // For hard deletes (if any), remove from list
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          // Mostly for soft deletes or edits
          setMessages((prev) => prev.map((msg) => msg.id === updated.id ? updated : msg));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnecting(false);
        } else if (status === "CHANNEL_ERROR") {
          // Realtime channel error - connection will retry automatically
          setIsConnecting(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!userId) {
      toast.error("Sign in required", {
        description: "Please sign in to join the chat conversation.",
      });
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        content,
        userId,
      });
      // Note: We don't manually add to 'messages' here because
      // Supabase Realtime will trigger the INSERT event and handle it.
      // Or we could do optimistic updates if we want instant feedback before server ack.
    } catch {
      const error = ERROR_MESSAGES.CHAT_SEND_FAILED;
      toast.error(error.title, {
        description: error.action || error.description,
      });
    }
  }, [userId, sendMessageMutation]);

  return {
    messages,
    isLoading: isHistoryLoading,
    isConnecting,
    sendMessage,
    isSending: sendMessageMutation.isPending,
  };
}
