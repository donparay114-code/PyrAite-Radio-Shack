"use client";

import { motion } from "framer-motion";
import { MessageCircle, Users, Radio, AlertCircle } from "lucide-react";
import { Chat } from "@/components/features";
import { GlassCard, Badge, PulseGlow, easings, InlineErrorBoundary } from "@/components/ui";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/AuthProvider";
import { useNowPlaying } from "@/hooks/useApi";

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: nowPlaying, error: nowPlayingError } = useNowPlaying();
  const chatHook = useChat();

  // Show connection status
  const showConnectionError = chatHook.isConnecting && !chatHook.isLoading;

  return (
    <div className="relative space-y-6">
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <PulseGlow color="#8b5cf6" size="lg" className="-top-32 -right-32" intensity={0.1} />
        <PulseGlow color="#06b6d4" size="lg" className="-bottom-32 -left-32" intensity={0.1} />
      </div>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easings.smooth }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Community Chat</h1>
              <p className="text-text-muted text-sm">Chat with fellow listeners in real-time</p>
            </div>
          </div>
          <Badge variant="violet" size="md" className="hidden sm:flex">
            <Users className="w-4 h-4 mr-1" />
            Live
          </Badge>
        </div>
      </motion.div>

      {/* Connection status warning */}
      {showConnectionError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-3 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-yellow-300">Connecting to chat server...</p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat - takes 2/3 on desktop */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easings.smooth }}
        >
          <InlineErrorBoundary fallbackText="Failed to load Chat">
            <Chat
              messages={chatHook.messages}
              isLoading={chatHook.isLoading}
              isSending={chatHook.isSending}
              onSendMessage={(content) => {
                if (user?.id) {
                  chatHook.sendMessage(content);
                }
              }}
              currentUser={user}
              isAuthenticated={isAuthenticated}
              maxHeight="calc(100vh - 250px)"
            />
          </InlineErrorBoundary>
        </motion.div>

        {/* Sidebar - Now Playing + Chat Rules */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: easings.smooth }}
        >
          {/* Now Playing Mini */}
          {nowPlaying?.song && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-pink-400" />
                </div>
                <span className="text-sm font-medium text-white">Now Playing</span>
              </div>
              <div className="flex items-center gap-3">
                {nowPlaying.song.cover_image_url ? (
                  <img
                    src={nowPlaying.song.cover_image_url}
                    alt={nowPlaying.song.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-violet-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {nowPlaying.song.title}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {nowPlaying.song.artist || "AI Generated"}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Chat Rules */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Chat Guidelines</h3>
            <ul className="space-y-2 text-xs text-text-muted">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                Be respectful and kind to everyone
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                No spam or excessive self-promotion
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                Keep discussions appropriate for all ages
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                Report any issues to moderators
              </li>
            </ul>
          </GlassCard>

          {/* User Info */}
          {isAuthenticated && user && (
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Your Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Tier</span>
                  <Badge variant="violet" size="sm">{user.tier}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Reputation</span>
                  <span className="text-white font-medium">{user.reputation_score}</span>
                </div>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}
