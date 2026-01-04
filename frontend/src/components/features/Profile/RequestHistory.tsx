"use client";

import { motion } from "framer-motion";
import { History, Music2, Clock, Zap } from "lucide-react";
import { useUserRequests } from "@/hooks/useApi";
import { formatDistanceToNow } from "date-fns";
import { GlassCard, StaggerContainer, StaggerItem, Badge, Skeleton, easings } from "@/components/ui";

interface RequestHistoryProps {
  userId: number;
}

// Loading skeleton for request history
function RequestHistorySkeleton() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton variant="text" className="h-6 w-40" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, ease: easings.smooth }}
          >
            <Skeleton variant="rounded" className="h-20 w-full" />
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// Get status badge variant
function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return { variant: "success" as const, label: "Completed" };
    case "pending":
    case "queued":
      return { variant: "warning" as const, label: "Pending" };
    case "failed":
      return { variant: "error" as const, label: "Failed" };
    case "generating":
      return { variant: "violet" as const, label: "Generating" };
    default:
      return { variant: "default" as const, label: status };
  }
}

export function RequestHistory({ userId }: RequestHistoryProps) {
  const { data: requests, isLoading } = useUserRequests(userId);

  if (isLoading) {
    return <RequestHistorySkeleton />;
  }

  if (!requests || requests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easings.smooth }}
      >
        <GlassCard className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
              <Music2 className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Requests Yet</h3>
            <p className="text-text-muted text-sm">
              Request your first AI-generated song and it will appear here!
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: easings.smooth }}
    >
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <History className="w-4 h-4 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Request History</h3>
          <Badge variant="default" size="sm" className="ml-auto">
            {requests.length} requests
          </Badge>
        </div>

        {/* Request list */}
        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {requests.map((req) => {
            const statusBadge = getStatusBadge(req.status);
            return (
              <StaggerItem key={req.id}>
                <motion.div
                  whileHover={{ scale: 1.01, x: 4 }}
                  transition={{ duration: 0.2, ease: easings.snappy }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 cursor-default"
                >
                  <div className="flex justify-between items-start gap-4">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={statusBadge.variant} size="sm">
                          {statusBadge.label}
                        </Badge>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(req.requested_at))} ago
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium truncate mb-1">
                        {req.original_prompt}
                      </p>
                      {req.genre_hint && (
                        <p className="text-xs text-text-muted">
                          Genre: <span className="text-violet-400">{req.genre_hint}</span>
                        </p>
                      )}
                    </div>

                    {/* Priority score */}
                    <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <div className="flex items-center gap-1 text-violet-400">
                        <Zap className="w-3 h-3" />
                        <span className="text-xs uppercase tracking-wider">Score</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {(req.priority_score || 0).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </GlassCard>
    </motion.div>
  );
}
