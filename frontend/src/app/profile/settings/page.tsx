"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Settings, Link2, Unlink, Save, LogOut, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { GlassCard, GlowButton } from "@/components/ui";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProfileSettings {
    id: number;
    display_name: string;
    email: string | null;
    google_id: string | null;
    telegram_id: number | null;
    telegram_username: string | null;
    avatar_url: string | null;
    tier: string;
    reputation_score: number;
    is_premium: boolean;
}

export default function ProfileSettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

    const [settings, setSettings] = useState<ProfileSettings | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [telegramUsername, setTelegramUsername] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login?redirect=/profile/settings");
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch profile settings
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem("auth_token");
                const response = await fetch(`${API_BASE}/api/profile/settings`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setSettings(data);
                    setDisplayName(data.display_name || "");
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [isAuthenticated]);

    const handleSaveProfile = async () => {
        if (!displayName.trim()) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE}/api/profile/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ display_name: displayName }),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setMessage({ type: "success", text: "Profile updated successfully!" });
            } else {
                throw new Error("Failed to update profile");
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to update profile" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLinkTelegram = async () => {
        if (!telegramUsername.trim()) return;

        setIsLinking(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE}/api/auth/google/link-telegram`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ telegram_username: telegramUsername }),
            });

            if (response.ok) {
                setSettings((prev) => prev ? { ...prev, telegram_username: telegramUsername.replace("@", "") } : null);
                setTelegramUsername("");
                setMessage({ type: "success", text: "Telegram linked successfully!" });
            } else {
                throw new Error("Failed to link Telegram");
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to link Telegram" });
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlinkTelegram = async () => {
        setIsUnlinking(true);
        setMessage(null);

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE}/api/profile/unlink-telegram`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setSettings((prev) => prev ? { ...prev, telegram_id: null, telegram_username: null } : null);
                setMessage({ type: "success", text: "Telegram unlinked successfully!" });
            } else {
                throw new Error("Failed to unlink Telegram");
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to unlink Telegram" });
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
                        <p className="text-sm text-text-muted">Manage your account and preferences</p>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "mb-6 p-4 rounded-xl border",
                            message.type === "success"
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}
                    >
                        {message.text}
                    </motion.div>
                )}

                {/* Profile Section */}
                <GlassCard className="p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-violet-400" />
                        Profile Information
                    </h2>

                    <div className="space-y-4">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold text-white">
                                {settings?.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-text-muted">Avatar</p>
                                <p className="text-xs text-text-muted mt-1">Avatar upload coming soon</p>
                            </div>
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className="block text-sm text-text-muted mb-2">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl",
                                    "bg-white/5 border border-white/10",
                                    "text-white placeholder:text-text-muted",
                                    "focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                )}
                                placeholder="Your display name"
                            />
                        </div>

                        {/* Save Button */}
                        <GlowButton
                            onClick={handleSaveProfile}
                            disabled={isSaving || !displayName.trim()}
                            leftIcon={<Save className="w-4 h-4" />}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </GlowButton>
                    </div>
                </GlassCard>

                {/* Connected Accounts */}
                <GlassCard className="p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-cyan-400" />
                        Connected Accounts
                    </h2>

                    <div className="space-y-4">
                        {/* Google Account (read-only) */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-red-400" />
                                <div>
                                    <p className="text-sm text-white">Google Account</p>
                                    <p className="text-xs text-text-muted">{settings?.email || "Connected"}</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                Connected
                            </span>
                        </div>

                        {/* Telegram */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-sm text-white">Telegram</p>
                                        {settings?.telegram_username ? (
                                            <p className="text-xs text-text-muted">@{settings.telegram_username}</p>
                                        ) : (
                                            <p className="text-xs text-text-muted">Not connected</p>
                                        )}
                                    </div>
                                </div>
                                {settings?.telegram_username && (
                                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                        Connected
                                    </span>
                                )}
                            </div>

                            {settings?.telegram_username ? (
                                <button
                                    onClick={handleUnlinkTelegram}
                                    disabled={isUnlinking}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                                        "bg-red-500/10 border border-red-500/20",
                                        "text-red-400 text-sm",
                                        "hover:bg-red-500/20 transition-colors",
                                        "disabled:opacity-50"
                                    )}
                                >
                                    <Unlink className="w-4 h-4" />
                                    {isUnlinking ? "Unlinking..." : "Unlink Telegram"}
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={telegramUsername}
                                        onChange={(e) => setTelegramUsername(e.target.value)}
                                        className={cn(
                                            "flex-1 px-4 py-2 rounded-lg",
                                            "bg-black/20 border border-white/10",
                                            "text-white placeholder:text-text-muted text-sm",
                                            "focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                        )}
                                        placeholder="@username"
                                    />
                                    <button
                                        onClick={handleLinkTelegram}
                                        disabled={isLinking || !telegramUsername.trim()}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg",
                                            "bg-blue-500/20 border border-blue-500/30",
                                            "text-blue-400 text-sm",
                                            "hover:bg-blue-500/30 transition-colors",
                                            "disabled:opacity-50"
                                        )}
                                    >
                                        <Link2 className="w-4 h-4" />
                                        {isLinking ? "Linking..." : "Link"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Account Stats (read-only) */}
                <GlassCard className="p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5">
                            <p className="text-sm text-text-muted">Tier</p>
                            <p className="text-lg font-semibold text-white capitalize">{settings?.tier || "New"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5">
                            <p className="text-sm text-text-muted">Reputation</p>
                            <p className="text-lg font-semibold text-white">{settings?.reputation_score || 0}</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                        "bg-red-500/10 border border-red-500/20",
                        "text-red-400",
                        "hover:bg-red-500/20 transition-colors"
                    )}
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </motion.div>
        </div>
    );
}
