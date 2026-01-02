"use strict";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured, type ChatMessage } from "@/lib/supabase";
import { useChatHistory, useSendMessage } from "./useApi";
import { toast } from "sonner";

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
      console.warn("Supabase not configured, skipping realtime subscription");
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
          console.error("Supabase Realtime channel error");
          setIsConnecting(false); // Stop showing "Connecting..."
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!userId) {
      toast.error("You must be logged in to chat");
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
      toast.error("Failed to send message");
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
