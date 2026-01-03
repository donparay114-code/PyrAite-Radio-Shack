"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/hooks/useApi";
import { ProfileHeader } from "@/components/features/Profile/ProfileHeader";
import { ProfileStats } from "@/components/features/Profile/ProfileStats";
import { RequestHistory } from "@/components/features/Profile/RequestHistory";
import { GlassCard, GlowButton } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User, RefreshCw } from "lucide-react";

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Use the full user data from API (contains stats not in AuthUser)
  const { data: fullUser, isLoading: userLoading, error, refetch } = useUser(authUser?.id || 0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || (isAuthenticated && userLoading)) {
    return (
      <div className="min-h-screen pl-64 pt-20 flex items-center justify-center" role="status" aria-busy="true" aria-label="Loading profile">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white pl-64 pt-20">
        <div className="max-w-5xl mx-auto p-8">
          <GlassCard className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <User className="w-12 h-12 text-text-muted opacity-50" />
              <p className="text-text-muted">Failed to load profile</p>
              <p className="text-sm text-red-400">{error.message}</p>
              <GlowButton
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </GlowButton>
            </div>
          </GlassCard>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !fullUser) {
    return null; // Redirecting...
  }

  return (
    <main className="min-h-screen bg-black text-white pl-64 pt-20">
      <div className="max-w-5xl mx-auto p-8">
        <ProfileHeader user={fullUser} isOwnProfile={true} />
        <ProfileStats user={fullUser} />
        <RequestHistory userId={fullUser.id} />
      </div>
    </main>
  );
}
