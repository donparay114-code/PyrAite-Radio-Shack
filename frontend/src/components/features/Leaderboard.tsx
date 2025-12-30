"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Music, ThumbsUp, Crown, Medal } from "lucide-react";
import { GlassCard, Avatar, Badge } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";
import type { User, UserTier, TIER_COLORS, TIER_LABELS } from "@/types";

interface LeaderboardProps {
  users: LeaderboardUser[];
  period: "daily" | "weekly" | "monthly" | "all_time";
  onPeriodChange: (period: "daily" | "weekly" | "monthly" | "all_time") => void;
}

interface LeaderboardUser extends User {
  rank: number;
  score: number;
}

const TIER_COLORS_MAP: Record<UserTier, string> = {
  new: "#71717a",
  regular: "#22c55e",
  trusted: "#3b82f6",
  vip: "#8b5cf6",
  elite: "#f59e0b",
};

export function Leaderboard({ users, period, onPeriodChange }: LeaderboardProps) {
  const periods = [
    { value: "daily" as const, label: "Today" },
    { value: "weekly" as const, label: "This Week" },
    { value: "monthly" as const, label: "This Month" },
    { value: "all_time" as const, label: "All Time" },
  ];

  const topThree = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
          {periods.map((p) => (
            <motion.button
              key={p.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                period === p.value
                  ? "bg-white/10 text-white"
                  : "text-text-muted hover:text-white"
              )}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Second place */}
        {topThree[1] && (
          <PodiumCard user={topThree[1]} position={2} />
        )}

        {/* First place */}
        {topThree[0] && (
          <PodiumCard user={topThree[0]} position={1} />
        )}

        {/* Third place */}
        {topThree[2] && (
          <PodiumCard user={topThree[2]} position={3} />
        )}
      </div>

      {/* Rest of leaderboard */}
      <GlassCard className="divide-y divide-white/5">
        {rest.map((user, index) => (
          <LeaderboardRow key={user.id} user={user} index={index + 4} />
        ))}

        {rest.length === 0 && (
          <div className="p-8 text-center text-text-muted">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No more users to display</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

interface PodiumCardProps {
  user: LeaderboardUser;
  position: 1 | 2 | 3;
}

function PodiumCard({ user, position }: PodiumCardProps) {
  const colors = {
    1: {
      bg: "from-amber-500/20 to-yellow-600/20",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.3)]",
      icon: Crown,
      iconColor: "text-amber-400",
    },
    2: {
      bg: "from-slate-400/20 to-gray-500/20",
      border: "border-slate-400/30",
      glow: "",
      icon: Medal,
      iconColor: "text-slate-300",
    },
    3: {
      bg: "from-orange-600/20 to-amber-700/20",
      border: "border-orange-600/30",
      glow: "",
      icon: Medal,
      iconColor: "text-orange-400",
    },
  };

  const style = colors[position];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={cn(
        position === 1 && "-mt-4 order-2",
        position === 2 && "order-1",
        position === 3 && "order-3"
      )}
    >
      <GlassCard
        variant="elevated"
        className={cn(
          "relative text-center p-6",
          `bg-gradient-to-b ${style.bg}`,
          style.border,
          style.glow
        )}
      >
        {/* Position badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              position === 1 && "bg-gradient-to-b from-amber-400 to-amber-600",
              position === 2 && "bg-gradient-to-b from-slate-300 to-slate-500",
              position === 3 && "bg-gradient-to-b from-orange-400 to-orange-600"
            )}
          >
            <span className="text-sm font-bold text-white">{position}</span>
          </div>
        </div>

        {/* Avatar */}
        <div className="mt-4 mb-4">
          <Avatar
            name={user.display_name || user.username || "User"}
            size="xl"
            tier={user.tier}
            showTierBorder
          />
        </div>

        {/* Name */}
        <h3 className="font-bold text-white truncate">
          {user.display_name || user.username || "Anonymous"}
        </h3>

        {/* Tier badge */}
        <div className="mt-2">
          <Badge
            size="sm"
            style={{
              backgroundColor: `${TIER_COLORS_MAP[user.tier]}20`,
              borderColor: `${TIER_COLORS_MAP[user.tier]}40`,
              color: TIER_COLORS_MAP[user.tier],
            }}
          >
            {user.tier}
          </Badge>
        </div>

        {/* Score */}
        <div className="mt-4">
          <p className="text-2xl font-bold text-gradient">
            {formatNumber(user.score)}
          </p>
          <p className="text-xs text-text-muted">reputation</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
          <div>
            <p className="text-sm font-semibold text-white">
              {formatNumber(user.total_requests)}
            </p>
            <p className="text-xs text-text-muted">requests</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {formatNumber(user.total_upvotes_received)}
            </p>
            <p className="text-xs text-text-muted">upvotes</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface LeaderboardRowProps {
  user: LeaderboardUser;
  index: number;
}

function LeaderboardRow({ user, index }: LeaderboardRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span className="text-sm font-bold text-text-muted">{index}</span>
      </div>

      {/* Avatar */}
      <Avatar
        name={user.display_name || user.username || "User"}
        size="md"
        tier={user.tier}
        showTierBorder
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">
          {user.display_name || user.username || "Anonymous"}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            size="sm"
            style={{
              backgroundColor: `${TIER_COLORS_MAP[user.tier]}20`,
              borderColor: `${TIER_COLORS_MAP[user.tier]}40`,
              color: TIER_COLORS_MAP[user.tier],
            }}
          >
            {user.tier}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Music className="w-4 h-4" />
          <span>{user.total_requests}</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-400">
          <ThumbsUp className="w-4 h-4" />
          <span>{user.total_upvotes_received}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="font-bold text-gradient">{formatNumber(user.score)}</p>
        <p className="text-xs text-text-muted">rep</p>
      </div>
    </motion.div>
  );
}
