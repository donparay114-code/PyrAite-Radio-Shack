'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NowPlaying, SongRequest } from '@/types';

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
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    const s = io(socketUrl, {
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

    s.on('moderation-settings-changed', (data: any) => {
      console.log('Moderation settings changed:', data);
      // You could show a toast notification here
    });

    s.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [channelId]);

  return { socket, nowPlaying, queue, listenerCount, isConnected };
}
