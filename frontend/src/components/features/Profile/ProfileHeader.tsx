"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Settings, Link2 } from "lucide-react";
import { User, UserTier, TIER_LABELS, TIER_COLORS } from "@/types";
import { useLinkTelegram } from "@/hooks/useApi";
import { GlassCard, Avatar, Badge, GlowButton, easings } from "@/components/ui";
import Link from "next/link";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
}

export function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
  const [telegramUsername, setTelegramUsername] = useState("");
  const linkTelegramMutation = useLinkTelegram();

  const handleLink = () => {
    if (!telegramUsername) return;
    linkTelegramMutation.mutate(
      {
        telegramUsername,
        userId: user.id,
      },
      {
        onSuccess: () => {
          setTelegramUsername("");
          toast.success("Telegram linked successfully!");
        },
        onError: () => {
          toast.error("Failed to link Telegram. Please try again.");
        },
      }
    );
  };

  // Get tier badge variant
  const getTierBadgeVariant = (tier: UserTier) => {
    switch (tier) {
      case UserTier.ELITE:
      case UserTier.VIP:
        return "gold" as const;
      case UserTier.TRUSTED:
        return "cyan" as const;
      case UserTier.REGULAR:
        return "violet" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easings.smooth }}
    >
      <GlassCard variant="elevated" className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: easings.smooth }}
          >
            <Avatar
              name={user.display_name || "User"}
              size="xl"
              tier={user.tier}
              showTierBorder
            />
          </motion.div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <motion.h1
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: easings.smooth }}
            >
              {user.display_name}
            </motion.h1>

            <motion.div
              className="flex items-center justify-center md:justify-start gap-3 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Badge variant={getTierBadgeVariant(user.tier)} size="sm">
                {TIER_LABELS[user.tier] || "Member"}
              </Badge>
              <span className="text-text-muted text-sm">
                Joined {new Date(user.created_at || Date.now()).toLocaleDateString()}
              </span>
            </motion.div>

            {/* Telegram Linking */}
            {isOwnProfile && !user.telegram_username && (
              <motion.div
                className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl max-w-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <p className="text-sm text-blue-300 mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Link your Telegram to sync stats & earn reputation!
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="@username"
                    className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 flex-1 transition-all duration-200"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                  />
                  <GlowButton
                    size="sm"
                    onClick={handleLink}
                    disabled={linkTelegramMutation.isPending || !telegramUsername}
                  >
                    {linkTelegramMutation.isPending ? "Linking..." : "Link"}
                  </GlowButton>
                </div>
              </motion.div>
            )}

            {/* Show linked Telegram */}
            {user.telegram_username && (
              <motion.div
                className="mt-2 text-sm text-text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <span className="text-cyan-400">@{user.telegram_username}</span> linked
              </motion.div>
            )}
          </div>

          {/* Quick Stats */}
          <motion.div
            className="flex gap-8 text-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: easings.smooth }}
          >
            <div>
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                {Math.round(user.reputation_score || 0)}
              </div>
              <div className="text-xs text-text-muted uppercase tracking-widest mt-1">Reputation</div>
            </div>
            <div>
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                {user.total_requests || 0}
              </div>
              <div className="text-xs text-text-muted uppercase tracking-widest mt-1">Requests</div>
            </div>
          </motion.div>

          {/* Edit Profile Button */}
          {isOwnProfile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Link href="/profile/settings">
                <GlowButton variant="secondary" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                  Edit Profile
                </GlowButton>
              </Link>
            </motion.div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
