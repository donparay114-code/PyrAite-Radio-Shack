'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatNumber, getGenreEmoji } from '@/lib/utils';
import { getGenreColor } from '@/lib/design-tokens';
import type { RadioChannel } from '@/types';

interface ChannelCardProps {
  channel: RadioChannel;
  showListeners?: boolean;
}

export function ChannelCard({ channel, showListeners = true }: ChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const genreColor = channel.genre ? getGenreColor(channel.genre) : '#1DB954';
  const genreEmoji = channel.genre ? getGenreEmoji(channel.genre) : '🎵';

  return (
    <Link href={`/channels/${channel.slug}`} className="block">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative overflow-hidden rounded-xl bg-background-tertiary p-5 transition-all duration-250"
        style={{
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: isHovered ? `1px solid rgba(255, 255, 255, 0.18)` : '1px solid transparent',
        }}
      >
        {/* Artwork Container */}
        <div className="relative mb-4 overflow-hidden rounded-md">
          {/* Placeholder artwork with genre color gradient */}
          <div
            className="aspect-square w-full"
            style={{
              background: `linear-gradient(135deg, ${genreColor}40 0%, ${genreColor}20 100%)`,
            }}
          >
            <div className="flex h-full items-center justify-center text-6xl">
              {genreEmoji}
            </div>
          </div>

          {/* Play Overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
            style={{
              opacity: isHovered ? 1 : 0,
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full transition-transform"
              style={{
                backgroundColor: genreColor,
                transform: isHovered ? 'scale(1)' : 'scale(0.8)',
              }}
            >
              <svg className="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Live Indicator */}
          {channel.isActive && (
            <div className="absolute right-2 top-2 rounded bg-status-error px-2 py-1 text-xs font-semibold uppercase tracking-wide">
              Live
            </div>
          )}

          {/* Premium Badge for Private Channels */}
          {channel.channelType === 'private' && (
            <div className="absolute left-2 top-2 rounded bg-brand-secondary px-2 py-1 text-xs font-semibold">
              ✨ Premium
            </div>
          )}
        </div>

        {/* Channel Info */}
        <div>
          <h3 className="mb-1 truncate text-lg font-semibold text-text-primary">
            {channel.name}
          </h3>

          {channel.genre && (
            <p className="mb-2 text-sm text-text-secondary">{channel.genre}</p>
          )}

          {channel.description && (
            <p className="mb-3 line-clamp-2 text-sm text-text-tertiary">
              {channel.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            {showListeners && (
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <span>{formatNumber(channel.listenerCount)} listening</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span>{formatNumber(channel.totalPlays)} plays</span>
            </div>
          </div>
        </div>

        {/* Hover Gradient Border Effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${genreColor}40 0%, transparent 100%)`,
            opacity: isHovered ? 0.1 : 0,
          }}
        />
      </div>
    </Link>
  );
}
