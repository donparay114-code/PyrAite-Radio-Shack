"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useUser } from "@/hooks/useApi";
import { ProfileHeader } from "@/components/features/Profile/ProfileHeader";
import { ProfileStats } from "@/components/features/Profile/ProfileStats";
import { RequestHistory } from "@/components/features/Profile/RequestHistory";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  if (authLoading || (isAuthenticated && userLoading)) {
    return (
      <div className="min-h-screen pl-64 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
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
