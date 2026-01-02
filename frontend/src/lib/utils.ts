import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
    if (num === undefined || num === null) return "0";
    return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function getInitials(name: string): string {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function truncate(str: string, length: number): string {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.substring(0, length) + "...";
}

export function formatTimeAgo(date: string | Date): string {
    if (!date) return "";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}
