"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Leaderboard } from "@/components/features";
import { useLeaderboard } from "@/hooks";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all_time">("weekly");
  const { data: leaderboard, isLoading } = useLeaderboard(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  const users = leaderboard?.users || [];

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
