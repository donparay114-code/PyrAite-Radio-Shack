'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NowPlaying, SongRequest } from '@/types';

interface ModerationSettings {
  enabled: boolean;
  strictMode?: boolean;
  blockedWords?: string[];
  maxRequestsPerHour?: number;
}

interface SocketError {
  message: string;
  code?: string;
}

/**
 * Validates that a value is a valid NowPlaying object
 */
function isValidNowPlaying(data: unknown): data is NowPlaying {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // NowPlaying must have at least a title or be null-ish
  return typeof obj.title === 'string' || obj.title === undefined;
}

/**
 * Validates that a value is a valid array of SongRequest objects
 */
function isValidQueueData(data: unknown): data is SongRequest[] {
  if (!Array.isArray(data)) return false;
  return data.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, unknown>;
    // SongRequest must have an id
    return typeof obj.id === 'number' || typeof obj.id === 'string';
  });
}

/**
 * Validates that a value is a valid listener count
 */
function isValidListenerCount(data: unknown): data is number {
  return typeof data === 'number' && !isNaN(data) && data >= 0;
}

/**
 * Validates that a value is a valid ModerationSettings object
 */
function isValidModerationSettings(data: unknown): data is ModerationSettings {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.enabled === 'boolean';
}

/**
 * Validates that a value is a valid SocketError object
 */
function isValidSocketError(data: unknown): data is SocketError {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.message === 'string';
}

interface UseSocketReturn {
  socket: Socket | null;
  nowPlaying: NowPlaying | null;
  queue: SongRequest[];
  listenerCount: number;
  isConnected: boolean;
}

export function useSocket(channelId: string): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const s = io(socketUrl, {
      path: '/socket.io', // Standard Socket.IO path, but verifying for FastAPI mount
      query: { channelId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join-channel', channelId);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('now-playing', (data: unknown) => {
      if (isValidNowPlaying(data)) {
        setNowPlaying(data);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Invalid now-playing data received:', data);
      }
    });

    s.on('queue-update', (data: unknown) => {
      if (isValidQueueData(data)) {
        setQueue(data);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Invalid queue-update data received:', data);
      }
    });

    s.on('listener-count', (count: unknown) => {
      if (isValidListenerCount(count)) {
        setListenerCount(count);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Invalid listener-count data received:', count);
      }
    });

    s.on('moderation-settings-changed', (data: unknown) => {
      if (isValidModerationSettings(data)) {
        // Moderation settings updated - could trigger UI refresh if needed
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Invalid moderation-settings data received:', data);
      }
    });

    s.on('error', (error: unknown) => {
      if (isValidSocketError(error)) {
        // Socket error handled silently - connection will attempt to reconnect
        // Could emit to error tracking in production
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Invalid error data received:', error);
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [channelId]);

  return { socket, nowPlaying, queue, listenerCount, isConnected };
}
