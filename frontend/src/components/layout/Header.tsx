"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Radio, Menu, Bell, Settings, MessageCircle, LogIn, Music, Users, ListMusic, Loader2, X, Search } from "lucide-react";
import { GlowButton, IconButton, Avatar, Badge, LiveBadge, GlassCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useSearch } from "@/hooks";

interface HeaderProps {
  onMenuClick?: () => void;
  isLive?: boolean;
  listeners?: number;
}

export function Header({ onMenuClick, isLive = false, listeners = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasNotifications] = useState(true);
  const { user, isAuthenticated, isLoading } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useSearch(debouncedQuery, isSearchOpen);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSearchFocus = () => {
    setIsSearchOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length >= 2) {
      setIsSearchOpen(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  };

  const handleResultClick = useCallback((type: "song" | "user" | "queue", id: number) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    if (type === "song") {
      router.push(`/queue`); // Songs are part of queue
    } else if (type === "user") {
      router.push(`/leaderboard`);
    } else {
      router.push(`/queue`);
    }
  }, [router]);

  const hasResults = searchResults && (
    searchResults.songs?.length > 0 ||
    searchResults.users?.length > 0 ||
    searchResults.queue_items?.length > 0
  );

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
          aria-label="Open menu"
          className={cn("lg:hidden", pathname === "/" && "lg:flex")}
        />

        {/* Logo */}
        <Link href="/">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              {isLive && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white">
                PYrte <span className="text-gradient">Radio</span>
              </h1>
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

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-4" ref={searchRef}>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            placeholder="Search songs, artists..."
            className={cn(
              "w-full h-10 px-4 pl-10 pr-10",
              "bg-white/[0.03] border border-white/[0.06]",
              "rounded-xl text-sm text-white placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50",
              "transition-all duration-200"
            )}
          />
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          )}
          {searchQuery && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearchOpen && debouncedQuery.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 z-50"
              >
                <GlassCard className="p-2 max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                    </div>
                  ) : hasResults ? (
                    <div className="space-y-2">
                      {/* Songs */}
                      {searchResults.songs?.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted uppercase tracking-wider px-2 py-1">Songs</p>
                          {searchResults.songs.slice(0, 3).map((song) => (
                            <button
                              key={song.id}
                              onClick={() => handleResultClick("song", song.id)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Music className="w-4 h-4 text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{song.title}</p>
                                <p className="text-xs text-text-muted truncate">{song.genre || song.artist || "Unknown"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Users */}
                      {searchResults.users?.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted uppercase tracking-wider px-2 py-1">Users</p>
                          {searchResults.users.slice(0, 3).map((u) => (
                            <button
                              key={u.id}
                              onClick={() => handleResultClick("user", u.id)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{u.display_name || u.telegram_username || "User"}</p>
                                <p className="text-xs text-text-muted">{u.tier} • {u.reputation_score} rep</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Queue Items */}
                      {searchResults.queue_items?.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted uppercase tracking-wider px-2 py-1">Queue</p>
                          {searchResults.queue_items.slice(0, 3).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick("queue", item.id)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <ListMusic className="w-4 h-4 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{item.original_prompt}</p>
                                <p className="text-xs text-text-muted">{item.genre_hint || "No genre"} • {item.status}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Search className="w-8 h-8 mx-auto text-text-muted opacity-50 mb-2" />
                      <p className="text-sm text-text-muted">No results for "{debouncedQuery}"</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Request button */}
        <Link href="/queue">
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
        </Link>

        {/* Notifications */}
        <div className="relative">
          <IconButton
            icon={<Bell className="w-5 h-5" />}
            variant="ghost"
            aria-label="Notifications"
          />
          {hasNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-label="New notifications" />
          )}
        </div>

        {/* Chat */}
        <Link href="/chat">
          <IconButton
            icon={<MessageCircle className="w-5 h-5" />}
            variant="ghost"
            aria-label="Open chat"
            className="hidden sm:flex"
          />
        </Link>

        {/* Settings */}
        <IconButton
          icon={<Settings className="w-5 h-5" />}
          variant="ghost"
          aria-label="Settings"
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
