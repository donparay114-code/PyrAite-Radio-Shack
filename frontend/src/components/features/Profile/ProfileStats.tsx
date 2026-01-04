"use client";

import { motion } from "framer-motion";
import { CheckCircle, TrendingUp, ThumbsUp, Heart } from "lucide-react";
import { User } from "@/types";
import { GlassCard, StaggerContainer, StaggerItem, easings } from "@/components/ui";

interface ProfileStatsProps {
  user: User;
}

export function ProfileStats({ user }: ProfileStatsProps) {
  const stats = [
    {
      label: "Successful",
      value: user.successful_requests || 0,
      icon: CheckCircle,
      gradient: "from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Success Rate",
      value: `${((user.success_rate || 0) * 100).toFixed(0)}%`,
      icon: TrendingUp,
      gradient: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Upvotes",
      value: user.total_upvotes_received || 0,
      icon: ThumbsUp,
      gradient: "from-pink-500/20 to-pink-600/10",
      iconColor: "text-pink-400",
      borderColor: "border-pink-500/20",
    },
    {
      label: "Votes Given",
      value: (user.total_upvotes_given || 0) + (user.total_downvotes_given || 0),
      icon: Heart,
      gradient: "from-violet-500/20 to-violet-600/10",
      iconColor: "text-violet-400",
      borderColor: "border-violet-500/20",
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4" staggerDelay={0.08}>
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <StaggerItem key={i}>
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              transition={{ duration: 0.2, ease: easings.snappy }}
            >
              <GlassCard
                noAnimation
                className={`bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} p-4 h-full`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
