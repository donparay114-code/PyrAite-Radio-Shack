"use client";

import { motion } from "framer-motion";
import {
  User as UserIcon,
  Trophy,
  Music,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Star,
  TrendingUp,
  Award,
  Zap,
} from "lucide-react";
import { GlassCard, Avatar, Badge, Skeleton, StaggerContainer, StaggerItem } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/hooks";
import { cn, formatNumber, formatDate } from "@/lib/utils";
import { UserTier, TIER_COLORS, TIER_LABELS } from "@/types";

// Tier configuration with styling
const TIER_CONFIG: Record<UserTier, {
  color: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  icon: typeof Star;
  description: string;
}> = {
  [UserTier.NEW]: {
    color: TIER_COLORS[UserTier.NEW],
    bgGradient: "from-zinc-500/20 to-zinc-600/20",
    borderColor: "border-zinc-500/30",
    glowColor: "shadow-[0_0_30px_rgba(113,113,122,0.2)]",
    icon: Star,
    description: "Just getting started",
  },
  [UserTier.REGULAR]: {
    color: TIER_COLORS[UserTier.REGULAR],
    bgGradient: "from-green-500/20 to-emerald-600/20",
    borderColor: "border-green-500/30",
    glowColor: "shadow-[0_0_30px_rgba(34,197,94,0.2)]",
    icon: TrendingUp,
    description: "Active community member",
  },
  [UserTier.TRUSTED]: {
    color: TIER_COLORS[UserTier.TRUSTED],
    bgGradient: "from-blue-500/20 to-indigo-600/20",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-[0_0_30px_rgba(59,130,246,0.3)]",
    icon: Award,
    description: "Trusted contributor",
  },
  [UserTier.VIP]: {
    color: TIER_COLORS[UserTier.VIP],
    bgGradient: "from-violet-500/20 to-purple-600/20",
    borderColor: "border-violet-500/30",
    glowColor: "shadow-[0_0_40px_rgba(139,92,246,0.3)]",
    icon: Zap,
    description: "VIP status achieved",
  },
  [UserTier.ELITE]: {
    color: TIER_COLORS[UserTier.ELITE],
    bgGradient: "from-amber-500/20 to-orange-600/20",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-[0_0_50px_rgba(245,158,11,0.4)]",
    icon: Trophy,
    description: "Elite tier - Top contributor",
  },
};

// Mock user data for development/demo
const mockUserData = {
  id: 1,
  telegram_id: 123456789,
  username: "radio_enthusiast",
  display_name: "Radio Enthusiast",
  reputation_score: 2450,
  tier: UserTier.VIP,
  total_requests: 87,
  successful_requests: 82,
  total_upvotes_received: 234,
  total_downvotes_received: 12,
  is_banned: false,
  is_premium: true,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
};

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();

  // For now, use mock data or merge with auth user
  const isLoading = authLoading;
  const userData = isAuthenticated && authUser
    ? { ...mockUserData, username: authUser.username, display_name: authUser.firstName }
    : mockUserData;

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const tierConfig = TIER_CONFIG[userData.tier];
  const TierIcon = tierConfig.icon;
  const successRate = userData.total_requests > 0
    ? Math.round((userData.successful_requests / userData.total_requests) * 100)
    : 0;
  const voteRatio = userData.total_upvotes_received + userData.total_downvotes_received > 0
    ? Math.round((userData.total_upvotes_received / (userData.total_upvotes_received + userData.total_downvotes_received)) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>
      </motion.div>

      <StaggerContainer className="space-y-6">
        {/* Profile Hero Card */}
        <StaggerItem>
          <GlassCard
            variant="elevated"
            glow="violet"
            className={cn(
              "relative overflow-visible",
              `bg-gradient-to-br ${tierConfig.bgGradient}`,
              tierConfig.borderColor,
              tierConfig.glowColor
            )}
          >
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar Section */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <Avatar
                    name={userData.display_name || userData.username || "User"}
                    size="xl"
                    tier={userData.tier}
                    showTierBorder
                    src={authUser?.photoUrl}
                  />
                  {userData.is_premium && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30"
                    >
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-left">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-white mb-1"
                  >
                    {userData.display_name || userData.username || "Anonymous"}
                  </motion.h2>

                  {userData.username && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      className="text-text-muted mb-3"
                    >
                      @{userData.username}
                    </motion.p>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center gap-2"
                  >
                    <TierBadge tier={userData.tier} />
                    <span className="text-sm text-text-muted">{tierConfig.description}</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="flex items-center gap-2 mt-4 text-text-muted justify-center sm:justify-start"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Joined {formatDate(userData.created_at)}</span>
                  </motion.div>
                </div>

                {/* Reputation Score */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-center"
                >
                  <div className="px-6 py-4 rounded-2xl bg-black/20 border border-white/10">
                    <p className="text-3xl sm:text-4xl font-bold text-gradient">
                      {formatNumber(userData.reputation_score)}
                    </p>
                    <p className="text-sm text-text-muted mt-1">Reputation</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </StaggerItem>

        {/* Stats Grid */}
        <StaggerItem>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Music}
              label="Total Requests"
              value={formatNumber(userData.total_requests)}
              color="violet"
              delay={0.1}
            />
            <StatCard
              icon={TrendingUp}
              label="Successful"
              value={formatNumber(userData.successful_requests)}
              subValue={`${successRate}% success rate`}
              color="green"
              delay={0.15}
            />
            <StatCard
              icon={ThumbsUp}
              label="Upvotes"
              value={formatNumber(userData.total_upvotes_received)}
              color="cyan"
              delay={0.2}
            />
            <StatCard
              icon={ThumbsDown}
              label="Downvotes"
              value={formatNumber(userData.total_downvotes_received)}
              color="red"
              delay={0.25}
            />
          </div>
        </StaggerItem>

        {/* Engagement Summary */}
        <StaggerItem>
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Engagement Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Vote Approval Rate</span>
                  <span className="text-sm font-medium text-white">{voteRatio}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${voteRatio}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-text-muted">
                  <span>{userData.total_upvotes_received} upvotes</span>
                  <span>{userData.total_downvotes_received} downvotes</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Request Success Rate</span>
                  <span className="text-sm font-medium text-white">{successRate}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${successRate}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-text-muted">
                  <span>{userData.successful_requests} successful</span>
                  <span>{userData.total_requests - userData.successful_requests} failed</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </StaggerItem>

        {/* Tier Progress */}
        <StaggerItem>
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-400" />
              Tier Status
            </h3>

            <div className="flex items-center gap-4">
              {Object.values(UserTier).map((tier, index) => {
                const config = TIER_CONFIG[tier];
                const isCurrentTier = tier === userData.tier;
                const isPastTier = Object.values(UserTier).indexOf(tier) < Object.values(UserTier).indexOf(userData.tier);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={tier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex-1 relative"
                  >
                    {index > 0 && (
                      <div
                        className={cn(
                          "absolute top-4 -left-2 w-4 h-0.5",
                          isPastTier || isCurrentTier ? "bg-white/30" : "bg-white/10"
                        )}
                      />
                    )}

                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all",
                          isCurrentTier && "ring-2 ring-offset-2 ring-offset-background",
                          isPastTier || isCurrentTier ? "opacity-100" : "opacity-40"
                        )}
                        style={{
                          backgroundColor: `${config.color}20`,
                          borderColor: config.color,
                          ...(isCurrentTier && { ringColor: config.color }),
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          isCurrentTier ? "text-white" : "text-text-muted"
                        )}
                        style={isCurrentTier ? { color: config.color } : undefined}
                      >
                        {TIER_LABELS[tier]}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }: { tier: UserTier }) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium text-sm"
      style={{
        backgroundColor: `${config.color}20`,
        borderColor: `${config.color}40`,
        color: config.color,
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {TIER_LABELS[tier]}
    </motion.div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: typeof Music;
  label: string;
  value: string;
  subValue?: string;
  color: "violet" | "green" | "cyan" | "red" | "amber";
  delay?: number;
}

function StatCard({ icon: Icon, label, value, subValue, color, delay = 0 }: StatCardProps) {
  const colorStyles = {
    violet: { bg: "from-violet-500/20 to-purple-600/20", icon: "text-violet-400", border: "border-violet-500/20" },
    green: { bg: "from-green-500/20 to-emerald-600/20", icon: "text-green-400", border: "border-green-500/20" },
    cyan: { bg: "from-cyan-500/20 to-blue-600/20", icon: "text-cyan-400", border: "border-cyan-500/20" },
    red: { bg: "from-red-500/20 to-rose-600/20", icon: "text-red-400", border: "border-red-500/20" },
    amber: { bg: "from-amber-500/20 to-orange-600/20", icon: "text-amber-400", border: "border-amber-500/20" },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <GlassCard noAnimation className={cn("p-4 h-full", `bg-gradient-to-br ${style.bg}`, style.border)}>
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg bg-black/20", style.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-text-muted truncate">{label}</p>
            {subValue && <p className="text-xs text-text-muted mt-1">{subValue}</p>}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Loading Skeleton
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton variant="rounded" width={40} height={40} />
        <Skeleton variant="text" width={150} height={28} />
      </div>

      <GlassCard className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton variant="circular" width={80} height={80} />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <Skeleton variant="text" width={200} height={28} className="mx-auto sm:mx-0" />
            <Skeleton variant="text" width={120} height={20} className="mx-auto sm:mx-0" />
            <Skeleton variant="rounded" width={100} height={28} className="mx-auto sm:mx-0" />
            <Skeleton variant="text" width={160} height={18} className="mx-auto sm:mx-0" />
          </div>
          <div className="text-center">
            <Skeleton variant="rounded" width={120} height={80} />
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <GlassCard key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton variant="rounded" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width={60} height={24} />
                <Skeleton variant="text" width={80} height={16} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        <Skeleton variant="text" width={180} height={24} className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton variant="text" width={120} height={16} />
                <Skeleton variant="text" width={40} height={16} />
              </div>
              <Skeleton variant="rounded" width="100%" height={8} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <Skeleton variant="text" width={140} height={24} className="mb-4" />
        <div className="flex items-center gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <Skeleton variant="circular" width={32} height={32} className="mb-2" />
              <Skeleton variant="text" width={50} height={14} />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
