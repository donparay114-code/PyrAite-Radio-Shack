"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Info, Smile, ImageIcon, X, Search } from "lucide-react";
import { GlassCard, Avatar, Badge } from "@/components/ui";
import { cn, formatTimeAgo } from "@/lib/utils";
import { UserTier, TIER_COLORS, TIER_LABELS } from "@/types";
import type { ChatMessage as APIChatMessage } from "@/lib/supabase";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";

// GIPHY instance with public beta key
const gf = new GiphyFetch("dc6zaTOxFJmzC"); // GIPHY public beta key

// Helper to detect GIF URLs
const isGifUrl = (content: string): boolean => {
  return content.startsWith("https://media") && content.includes("giphy.com");
};

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle emoji selection
  const handleEmojiSelect = (emoji: { native: string }) => {
    setInputValue((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Handle GIF selection
  const handleGifSelect = (gif: { images: { fixed_height: { url: string } } }) => {
    onSendMessage(gif.images.fixed_height.url);
    setShowGifPicker(false);
    setGifSearchTerm("");
  };

  // Fetch GIFs based on search term or trending
  const fetchGifs = useCallback(
    (offset: number) => {
      if (gifSearchTerm.trim()) {
        return gf.search(gifSearchTerm, { offset, limit: 10 });
      }
      return gf.trending({ offset, limit: 10 });
    },
    [gifSearchTerm]
  );

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

  // Handle message submission (allows anonymous users)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isSending) return;

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
      <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Live Chat</h2>
            <p className="text-xs text-text-muted" role="status" aria-live="polite">
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
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-[300px] max-h-[var(--chat-max-height)]"
        // eslint-disable-next-line react/forbid-dom-props
        style={{ "--chat-max-height": maxHeight } as React.CSSProperties}
        role="log"
        aria-label="Chat messages"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
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
              className="flex flex-col items-center justify-center py-8 text-center"
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

      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-20 left-4 z-50"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white z-10"
                aria-label="Close emoji picker"
              >
                <X className="w-3 h-3" />
              </button>
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIF Picker Modal */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowGifPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Choose a GIF</h3>
                <button
                  type="button"
                  onClick={() => setShowGifPicker(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  aria-label="Close GIF picker"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search GIFs..."
                    value={gifSearchTerm}
                    onChange={(e) => setGifSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              {/* GIF Grid */}
              <div className="flex-1 overflow-y-auto p-3">
                <Grid
                  key={gifSearchTerm}
                  width={360}
                  columns={2}
                  fetchGifs={fetchGifs}
                  onGifClick={(gif, e) => {
                    e.preventDefault();
                    handleGifSelect(gif);
                  }}
                  noLink
                />
              </div>

              {/* GIPHY attribution */}
              <div className="p-2 border-t border-white/10 text-center">
                <span className="text-xs text-zinc-500">Powered by GIPHY</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area - allows both authenticated and anonymous users */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-white/[0.06]"
      >
        <div className="flex items-end gap-3">
          {isAuthenticated ? (
            <Avatar
              name={currentUser?.firstName || currentUser?.username || "User"}
              src={currentUser?.photoUrl}
              size="sm"
              tier={currentUser?.tier}
              showTierBorder
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-text-muted font-medium">?</span>
            </div>
          )}
          <div className="flex-1 relative">
            {/* Emoji & GIF buttons */}
            <div className="absolute left-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  showEmojiPicker
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
                aria-label="Open emoji picker"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  showGifPicker
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
                aria-label="Open GIF picker"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAuthenticated ? "Type a message..." : "Type as Anonymous..."}
              aria-label="Type a message"
              disabled={!isConnected || isSending}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl pl-20 pr-12 py-3",
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
              aria-label="Send message"
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
        {!isAuthenticated && (
          <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Chatting as Anonymous. Sign in to show your name.
          </p>
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

  // Determine if anonymous (no user_id or tier is "anon")
  const isAnonymous = !message.user_id || message.user_tier === "anon";
  const displayName = message.user_display_name || (isAnonymous ? "Anonymous" : `User ${message.user_id}`);

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
      {/* Avatar - different for anonymous users */}
      {isAnonymous ? (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-text-muted font-medium">?</span>
        </div>
      ) : (
        <Avatar
          name={displayName}
          size="sm"
        />
      )}

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
          <span className={cn(
            "text-sm font-medium",
            isAnonymous ? "text-text-muted italic" : "text-white"
          )}>
            {displayName}
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
            "rounded-2xl overflow-hidden",
            isGifUrl(message.content)
              ? ""
              : cn(
                "px-4 py-2.5",
                isOwnMessage
                  ? "bg-violet-500/20 border border-violet-500/30 rounded-tr-md"
                  : isAnonymous
                    ? "bg-white/[0.03] border border-white/5 rounded-tl-md"
                    : "bg-white/5 border border-white/10 rounded-tl-md"
              )
          )}
        >
          {isGifUrl(message.content) ? (
            <img
              src={message.content}
              alt="GIF"
              className="max-w-[200px] rounded-xl"
              loading="lazy"
            />
          ) : (
            <p className="text-sm text-white whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
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
