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
      console.log('Socket connected');
      setIsConnected(true);
      s.emit('join-channel', channelId);
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    s.on('now-playing', (data: NowPlaying) => {
      console.log('Now playing update:', data);
      setNowPlaying(data);
    });

    s.on('queue-update', (data: SongRequest[]) => {
      console.log('Queue update:', data.length, 'tracks');
      setQueue(data);
    });

    s.on('listener-count', (count: number) => {
      setListenerCount(count);
    });

    s.on('moderation-settings-changed', (data: ModerationSettings) => {
      console.log('Moderation settings changed:', data);
    });

    s.on('error', (error: SocketError) => {
      console.error('Socket error:', error.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [channelId]);

  return { socket, nowPlaying, queue, listenerCount, isConnected };
}
