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

    s.on('now-playing', (data: NowPlaying) => {
      setNowPlaying(data);
    });

    s.on('queue-update', (data: SongRequest[]) => {
      setQueue(data);
    });

    s.on('listener-count', (count: number) => {
      setListenerCount(count);
    });

    s.on('moderation-settings-changed', (_data: ModerationSettings) => {
      // Moderation settings updated - could trigger UI refresh if needed
    });

    s.on('error', (_error: SocketError) => {
      // Socket error handled silently - connection will attempt to reconnect
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [channelId]);

  return { socket, nowPlaying, queue, listenerCount, isConnected };
}
