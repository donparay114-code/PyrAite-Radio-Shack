"use client";

import { useState } from "react";
import { Leaderboard } from "@/components/features";
import { useLeaderboard } from "@/hooks";
import type { User, UserTier } from "@/types";

// Mock leaderboard data
const mockLeaderboardUsers = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  telegram_id: 100000 + i,
  telegram_username: `user_${i + 1}`,
  username: `user_${i + 1}`,
  display_name: [
    "DJ Master",
    "Beat Maker",
    "Synth Lord",
    "Bass Queen",
    "Melody King",
    "Groove Master",
    "Sound Wizard",
    "Rhythm Pro",
    "Tune Creator",
    "Music Lover",
    "Audio Ninja",
    "Track Star",
    "Mix Master",
    "Flow Artist",
    "Vibe Curator",
    "Song Crafter",
    "Note Runner",
    "Beat Dropper",
    "Chord Chaser",
    "Tone Setter",
  ][i],
  reputation_score: 5000 - i * 200,
  tier: (["elite", "elite", "vip", "vip", "vip", "trusted", "trusted", "trusted", "regular", "regular"][i] ||
    "regular") as UserTier,
  total_requests: 100 - i * 4,
  successful_requests: 95 - i * 4,
  total_upvotes_received: 500 - i * 20,
  total_downvotes_received: 10 + i,
  total_upvotes_given: 50 + i,
  total_downvotes_given: 2 + i,
  success_rate: 0.95,
  is_banned: false,
  is_premium: i < 5,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * (i + 1)).toISOString(),
  rank: i + 1,
  score: 5000 - i * 200,
}));

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all_time">("weekly");

  // In production:
  // const { data: leaderboard, isLoading } = useLeaderboard(period);

  return (
    <div className="max-w-4xl mx-auto">
      <Leaderboard
        users={mockLeaderboardUsers}
        period={period}
        onPeriodChange={setPeriod}
      />
    </div>
  );
}
