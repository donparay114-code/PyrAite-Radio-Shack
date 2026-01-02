"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  ListMusic,
  TrendingUp,
  Users,
  History,
  Settings,
  HelpCircle,
  Crown,
  X,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    label: "Now Playing",
    href: "/",
    icon: Radio,
  },
  {
    label: "Queue",
    href: "/queue",
    icon: ListMusic,
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageCircle,
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: TrendingUp,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    label: "Community",
    href: "/community",
    icon: Users,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
];

const bottomItems = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Help",
    href: "/help",
    icon: HelpCircle,
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed top-0 left-0 z-50",
          "w-[280px] h-full pt-20 pb-6",
          "bg-background/95 backdrop-blur-xl",
          "border-r border-white/[0.06]",
          "flex flex-col",
          "lg:translate-x-0 lg:z-30"
        )}
      >
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 lg:hidden"
        >
          <X className="w-5 h-5 text-text-muted" />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Premium card */}
        <div className="px-4 mb-4">
          <GlassCard variant="elevated" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Go Premium</p>
                <p className="text-xs text-text-muted">Skip the queue</p>
              </div>
            </div>
            <button className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Upgrade Now
            </button>
          </GlassCard>
        </div>

        {/* Bottom navigation */}
        <div className="px-4 space-y-1 border-t border-white/[0.06] pt-4">
          {bottomItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
              onClick={onClose}
            />
          ))}
        </div>
      </motion.aside>
    </>
  );
}

interface NavItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ label, href, icon: Icon, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-xl",
        "text-sm font-medium transition-all duration-200",
        isActive
          ? "text-white"
          : "text-text-muted hover:text-white hover:bg-white/[0.03]"
      )}
    >
      {/* Active background */}
      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 bg-white/[0.06] rounded-xl"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-r-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <Icon className={cn("w-5 h-5 relative z-10", isActive && "text-violet-400")} />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}
