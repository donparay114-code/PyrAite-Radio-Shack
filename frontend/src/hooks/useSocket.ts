'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NowPlaying, SongRequest } from '@/types';

// Event payload types
export interface VoteUpdatePayload {
  queue_id: number;
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface GenerationProgressPayload {
  queue_id: number;
  status: string;
  progress_msg: string;
  eta: string | null;
}

export interface QueueUpdatePayload {
  items: SongRequest[];
}

interface UseSocketReturn {
  socket: Socket | null;
  nowPlaying: NowPlaying | null;
  queue: SongRequest[];
  listenerCount: number;
  isConnected: boolean;
  // Callbacks for new events
  onVoteUpdate: (callback: (data: VoteUpdatePayload) => void) => () => void;
  onGenerationProgress: (callback: (data: GenerationProgressPayload) => void) => () => void;
  onQueueUpdate: (callback: (data: QueueUpdatePayload) => void) => () => void;
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

    s.on('now_playing', (data: NowPlaying) => {
      console.log('Now playing update:', data);
      setNowPlaying(data);
    });

    s.on('queue_updated', (data: { items: SongRequest[] }) => {
      console.log('Queue update:', data.items?.length || 0, 'tracks');
      setQueue(data.items || []);
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

  // Callback factory for vote updates
  const onVoteUpdate = useCallback((callback: (data: VoteUpdatePayload) => void) => {
    if (!socket) return () => {};
    socket.on('vote_updated', callback);
    return () => socket.off('vote_updated', callback);
  }, [socket]);

  // Callback factory for generation progress
  const onGenerationProgress = useCallback((callback: (data: GenerationProgressPayload) => void) => {
    if (!socket) return () => {};
    socket.on('generation_progress', callback);
    return () => socket.off('generation_progress', callback);
  }, [socket]);

  // Callback factory for queue updates
  const onQueueUpdate = useCallback((callback: (data: QueueUpdatePayload) => void) => {
    if (!socket) return () => {};
    socket.on('queue_updated', callback);
    return () => socket.off('queue_updated', callback);
  }, [socket]);

  return {
    socket,
    nowPlaying,
    queue,
    listenerCount,
    isConnected,
    onVoteUpdate,
    onGenerationProgress,
    onQueueUpdate,
  };
}
