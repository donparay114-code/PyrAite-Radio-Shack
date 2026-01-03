"use client";

import { useState } from "react";
import { Leaderboard } from "@/components/features";
import { useLeaderboard } from "@/hooks";
import { GlassCard } from "@/components/ui";
import { Trophy, Loader2 } from "lucide-react";
import type { User, UserTier } from "@/types";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all_time">("weekly");
  const { data: leaderboard, isLoading, error } = useLeaderboard(period);

  // Transform API response to match component expectations
  const users = leaderboard?.users?.map((entry) => ({
    ...entry.user,
    rank: entry.rank,
    score: entry.score,
  })) || [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-text-muted">Loading leaderboard...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Trophy className="w-12 h-12 text-text-muted opacity-50" />
            <p className="text-text-muted">Failed to load leaderboard</p>
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Leaderboard
        users={users}
        period={period}
        onPeriodChange={setPeriod}
      />
    </div>
  );
}
