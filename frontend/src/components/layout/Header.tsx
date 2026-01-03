"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Menu, Bell, Settings, User, MessageCircle, LogIn } from "lucide-react";
import { GlowButton, IconButton, Avatar, Badge, LiveBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

interface HeaderProps {
  onMenuClick?: () => void;
  isLive?: boolean;
  listeners?: number;
}

export function Header({ onMenuClick, isLive = false, listeners = 0 }: HeaderProps) {
  const pathname = usePathname();
  const [hasNotifications] = useState(true);
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-16 px-4 md:px-6",
        "flex items-center justify-between gap-4",
        "bg-background/80 backdrop-blur-xl",
        "border-b border-white/[0.06]"
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <IconButton
          icon={<Menu className="w-5 h-5" />}
          onClick={onMenuClick}
          className={cn("lg:hidden", pathname === "/" && "lg:flex")}
        />

        {/* Logo */}
        <Link href="/" className="block">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative h-10 sm:h-12 w-auto">
              <Image
                src="/logo.png"
                alt="PyrAite Radio"
                width={160}
                height={48}
                className="h-full w-auto object-contain"
                priority
              />
              {isLive && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        </Link>

        {/* Live indicator */}
        {isLive && (
          <div className="hidden md:flex items-center gap-2 ml-4">
            <LiveBadge />
            <Badge variant="default" size="md">
              {listeners.toLocaleString()} listening
            </Badge>
          </div>
        )}
      </div>

      {/* Center - Search (optional) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search songs, artists..."
            className={cn(
              "w-full h-10 px-4 pl-10",
              "bg-white/[0.03] border border-white/[0.06]",
              "rounded-xl text-sm text-white placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50",
              "transition-all duration-200"
            )}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Request button */}
        <GlowButton
          size="sm"
          className="hidden sm:flex"
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Request
        </GlowButton>

        {/* Notifications */}
        <div className="relative">
          <IconButton
            icon={<Bell className="w-5 h-5" />}
            variant="ghost"
          />
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>

        {/* Chat */}
        <Link href="/chat">
          <IconButton
            icon={<MessageCircle className="w-5 h-5" />}
            variant="ghost"
            className="hidden sm:flex"
          />
        </Link>

        {/* Settings */}
        <IconButton
          icon={<Settings className="w-5 h-5" />}
          variant="ghost"
          className="hidden sm:flex"
        />

        {/* User section - Login button or Avatar */}
        {isLoading ? (
          <div className="ml-2 w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        ) : isAuthenticated && user ? (
          <Link href="/profile">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-2 cursor-pointer"
            >
              <Avatar
                name={user.firstName || user.username || "User"}
                src={user.photoUrl}
                size="sm"
              />
            </motion.div>
          </Link>
        ) : (
          <Link href="/login">
            <GlowButton
              size="sm"
              variant="secondary"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In
            </GlowButton>
          </Link>
        )}
      </div>
    </motion.header>
  );
}
