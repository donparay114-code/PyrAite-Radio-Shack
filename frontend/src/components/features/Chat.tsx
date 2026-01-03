"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Info } from "lucide-react";
import { GlassCard, Avatar, Badge } from "@/components/ui";
import { cn, formatTimeAgo } from "@/lib/utils";
import { UserTier, TIER_COLORS, TIER_LABELS } from "@/types";
import type { ChatMessage as APIChatMessage } from "@/lib/supabase";

// Extended chat message type for display
export interface DisplayChatMessage {
  id: number;
  content: string;
  message_type: APIChatMessage["message_type"];
  created_at: string;
  is_deleted: boolean;
  user?: {
    id: number;
    username: string | null;
    display_name: string | null;
    avatar_url?: string | null;
    tier: UserTier;
  };
}

// User type for the current user
interface ChatUser {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  tier?: UserTier;
}

interface ChatProps {
  messages: APIChatMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  onSendMessage: (content: string) => void;
  currentUser?: ChatUser | null;
  isAuthenticated?: boolean;
  maxHeight?: string;
  className?: string;
}

export function Chat({
  messages,
  isLoading = false,
  isSending = false,
  onSendMessage,
  currentUser,
  isAuthenticated = false,
  maxHeight = "500px",
  className,
}: ChatProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldAutoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isSending || !isAuthenticated) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    onSendMessage(messageContent);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check if realtime is connected (we assume connected if we have messages or not loading)
  const isConnected = !isLoading;

  return (
    <GlassCard variant="elevated" className={cn("flex flex-col relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Live Chat</h2>
            <p className="text-xs text-text-muted">
              {isConnected ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Connecting...
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge variant="violet" size="sm">
          {messages.length} messages
        </Badge>
      </div>

      {/* Messages container */}
      {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{ maxHeight }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
              aria-busy="true"
              aria-label="Loading messages"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full mb-4"
              />
              <p className="text-text-muted">Loading messages...</p>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <MessageCircle className="w-12 h-12 text-text-muted mb-4" />
              <p className="text-text-muted">No messages yet</p>
              <p className="text-text-muted text-sm mt-1">
                Be the first to say something!
              </p>
            </motion.div>
          ) : (
            messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isOwnMessage={currentUser?.id === message.user_id}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {!shouldAutoScroll && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setShouldAutoScroll(true);
              scrollToBottom();
            }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-violet-500/80 text-white text-xs font-medium hover:bg-violet-500 transition-colors shadow-lg z-10"
          >
            New messages below
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-white/[0.06]"
      >
        {!isAuthenticated ? (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/5 text-text-muted text-sm">
            <Info className="w-4 h-4" />
            Sign in with Telegram to join the chat
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <Avatar
              name={currentUser?.firstName || currentUser?.username || "User"}
              src={currentUser?.photoUrl}
              size="sm"
              tier={currentUser?.tier}
              showTierBorder
            />
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={!isConnected || isSending}
                rows={1}
                aria-label="Chat message input"
                className={cn(
                  "w-full resize-none rounded-xl px-4 py-3 pr-12",
                  "bg-white/5 border border-white/10",
                  "text-white placeholder:text-text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200",
                  "min-h-[48px] max-h-[120px]"
                )}
              />
              <motion.button
                type="submit"
                disabled={!inputValue.trim() || isSending || !isConnected}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "absolute right-2 bottom-2 w-8 h-8 rounded-lg",
                  "flex items-center justify-center",
                  "bg-violet-500 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                {isSending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </form>
    </GlassCard>
  );
}

// Individual chat message component
interface ChatMessageItemProps {
  message: APIChatMessage;
  isOwnMessage: boolean;
  index: number;
}

function ChatMessageItem({ message, isOwnMessage, index }: ChatMessageItemProps) {
  // System messages have different styling
  if (message.message_type !== "text") {
    return <SystemMessage message={message} index={index} />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
      className={cn(
        "group flex gap-3",
        isOwnMessage && "flex-row-reverse"
      )}
    >
      {/* Avatar placeholder - in production would show user avatar */}
      <Avatar
        name={`User ${message.user_id || "Unknown"}`}
        size="sm"
      />

      {/* Message content */}
      <div
        className={cn(
          "flex-1 max-w-[75%]",
          isOwnMessage && "flex flex-col items-end"
        )}
      >
        {/* Header with name and time */}
        <div
          className={cn(
            "flex items-center gap-2 mb-1",
            isOwnMessage && "flex-row-reverse"
          )}
        >
          <span className="text-sm font-medium text-white">
            {message.user_id ? `User ${message.user_id}` : "Anonymous"}
          </span>
          <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTimeAgo(message.created_at)}
          </span>
        </div>

        {/* Message bubble */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={cn(
            "px-4 py-2.5 rounded-2xl",
            isOwnMessage
              ? "bg-violet-500/20 border border-violet-500/30 rounded-tr-md"
              : "bg-white/5 border border-white/10 rounded-tl-md"
          )}
        >
          <p className="text-sm text-white whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// System message component
interface SystemMessageProps {
  message: APIChatMessage;
  index: number;
}

function SystemMessage({ message, index }: SystemMessageProps) {
  const typeStyles: Record<string, string> = {
    system: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    now_playing: "bg-pink-500/10 border-pink-500/20 text-pink-400",
    request_approved: "bg-green-500/10 border-green-500/20 text-green-400",
    milestone: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };

  const style = typeStyles[message.message_type] || typeStyles.system;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="flex justify-center"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full border text-sm",
          style
        )}
      >
        <span>{message.content}</span>
      </div>
    </motion.div>
  );
}
