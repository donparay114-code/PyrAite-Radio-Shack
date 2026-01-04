"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { RequestModal } from "@/components/features/RequestModal";
import { cn } from "@/lib/utils";
import { useSubmitRequest } from "@/hooks/useApi";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const pathname = usePathname();
  const submitMutation = useSubmitRequest();

  const handleSubmitRequest = async (data: {
    prompt: string;
    genre: string | null;
    isInstrumental: boolean;
    styleTags: string[];
  }) => {
    await submitMutation.mutateAsync(data);
    setIsRequestModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onRequestClick={() => setIsRequestModalOpen(true)}
        isLive={true}
        listeners={1234}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleSubmitRequest}
        isSubmitting={submitMutation.isPending}
      />

      <main
        className={cn(
          "pt-16 min-h-screen",
          pathname !== "/" && "lg:pl-[280px]",
          "transition-all duration-300"
        )}
      >
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
