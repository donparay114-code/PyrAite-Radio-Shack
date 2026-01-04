"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/hooks/useApi";
import { ProfileHeader } from "@/components/features/Profile/ProfileHeader";
import { ProfileStats } from "@/components/features/Profile/ProfileStats";
import { RequestHistory } from "@/components/features/Profile/RequestHistory";
import { ProfileEditPanel } from "@/components/features/Profile/ProfileEditPanel";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlassCard, PulseGlow, Skeleton, easings } from "@/components/ui";

// Loading skeleton for profile page
function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Skeleton variant="circular" className="w-24 h-24" />
          <div className="flex-1 space-y-3 text-center md:text-left">
            <Skeleton variant="text" className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton variant="text" className="h-4 w-32 mx-auto md:mx-0" />
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <Skeleton variant="text" className="h-8 w-12 mb-1" />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
            <div className="text-center">
              <Skeleton variant="text" className="h-8 w-12 mb-1" />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} noAnimation className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10" />
              <div className="flex-1">
                <Skeleton variant="text" className="h-4 w-16 mb-1" />
                <Skeleton variant="text" className="h-6 w-12" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* History skeleton */}
      <GlassCard className="p-6">
        <Skeleton variant="text" className="h-6 w-40 mb-6" />
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
    </div>
  );
}

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Use the full user data from API (contains stats not in AuthUser)
  const { data: fullUser, isLoading: userLoading } = useUser(authUser?.id || 0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading skeleton
  if (authLoading || (isAuthenticated && userLoading)) {
    return (
      <div className="relative">
        {/* Ambient background glow effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <PulseGlow color="#8b5cf6" size="lg" className="-top-32 -left-32" intensity={0.15} />
          <PulseGlow color="#ec4899" size="lg" className="-bottom-32 -right-32" intensity={0.15} />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !fullUser) {
    return null; // Redirecting...
  }

  return (
    <div className="relative">
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <PulseGlow color="#8b5cf6" size="lg" className="-top-32 -left-32" intensity={0.15} />
        <PulseGlow color="#ec4899" size="lg" className="-bottom-32 -right-32" intensity={0.15} />
      </div>

      <motion.div
        className="max-w-6xl mx-auto px-4 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easings.smooth }}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Edit Panel */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <ProfileEditPanel user={fullUser} />
          </div>

          {/* Right Column - Profile Content */}
          <div className="flex-1 space-y-8">
            <ProfileHeader user={fullUser} isOwnProfile={true} />
            <ProfileStats user={fullUser} />
            <RequestHistory userId={fullUser.id} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
