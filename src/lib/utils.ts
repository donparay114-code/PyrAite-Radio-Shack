import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format duration from seconds to MM:SS
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format time ago (e.g., "2 minutes ago")
export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Format number with commas (e.g., 1,234,567)
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Calculate queue wait time estimate
export function estimateWaitTime(queuePosition: number, avgTrackDuration: number = 180): string {
  const totalSeconds = queuePosition * avgTrackDuration;
  const minutes = Math.floor(totalSeconds / 60);

  if (minutes < 1) return 'Less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hours === 1 && remainingMins === 0) return '1 hour';
  if (hours === 1) return `1 hour ${remainingMins} min`;
  if (remainingMins === 0) return `${hours} hours`;

  return `${hours} hours ${remainingMins} min`;
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Get genre emoji
export function getGenreEmoji(genre: string): string {
  const emojiMap: Record<string, string> = {
    rap: '🎤',
    jazz: '🎷',
    lofi: '🌙',
    'lo-fi': '🌙',
    electronic: '🎧',
    rock: '🎸',
    classical: '🎻',
    indie: '🎵',
    pop: '✨',
    country: '🤠',
    rnb: '💜',
    'r&b': '💜',
  };

  const normalized = genre.toLowerCase().replace(/[^a-z]/g, '');
  return emojiMap[normalized] || '🎵';
}

// Sleep utility for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate random ID
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
