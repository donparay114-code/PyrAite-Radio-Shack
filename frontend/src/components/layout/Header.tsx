"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Radio, Menu, Bell, Settings, User, LogIn, LogOut, ChevronDown } from "lucide-react";
import { GlowButton, IconButton, Avatar, Badge, LiveBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";

interface HeaderProps {
  onMenuClick?: () => void;
  onRequestClick?: () => void;
  isLive?: boolean;
  listeners?: number;
}

export function Header({ onMenuClick, onRequestClick, isLive = false, listeners = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasNotifications] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
  };

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
          label="Toggle menu"
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
          onClick={() => {
            if (!isAuthenticated) {
              router.push('/login');
            } else {
              onRequestClick?.();
            }
          }}
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
            label="Notifications"
            variant="ghost"
          />
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>

        {/* Settings */}
        <IconButton
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          variant="ghost"
          className="hidden sm:flex"
        />

        {/* User section - Login button or Avatar with dropdown */}
        {isLoading ? (
          <div className="ml-2 w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="relative ml-2" ref={userMenuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-white/5 transition-colors"
            >
              <Avatar
                name={user.firstName || user.username || "User"}
                src={user.photoUrl}
                size="sm"
              />
              <ChevronDown className={cn(
                "w-4 h-4 text-text-muted transition-transform duration-200",
                showUserMenu && "rotate-180"
              )} />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute right-0 top-full mt-2 w-48",
                    "bg-background/95 backdrop-blur-xl",
                    "border border-white/10 rounded-xl",
                    "shadow-xl shadow-black/20",
                    "overflow-hidden z-50"
                  )}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-medium text-white truncate">
                      {user.firstName || user.username || "User"}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {user.email || `@${user.username}`}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        "text-sm text-white hover:bg-white/5",
                        "transition-colors"
                      )}
                    >
                      <User className="w-4 h-4 text-text-muted" />
                      Profile
                    </Link>
                    <Link
                      href="/profile/settings"
                      onClick={() => setShowUserMenu(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        "text-sm text-white hover:bg-white/5",
                        "transition-colors"
                      )}
                    >
                      <Settings className="w-4 h-4 text-text-muted" />
                      Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-white/[0.06] py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 w-full",
                        "text-sm text-red-400 hover:bg-red-500/10",
                        "transition-colors"
                      )}
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
