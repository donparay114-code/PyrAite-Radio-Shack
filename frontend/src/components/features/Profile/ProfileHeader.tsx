
import { useState } from "react";
import { User, UserTier, TIER_LABELS } from "@/types";
import { useLinkTelegram } from "@/hooks/useApi";

interface ProfileHeaderProps {
    user: User;
    isOwnProfile: boolean;
}

export function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
    const [telegramUsername, setTelegramUsername] = useState("");
    const linkTelegramMutation = useLinkTelegram();

    const handleLink = () => {
        if (!telegramUsername) return;
        linkTelegramMutation.mutate({
            telegramUsername,
            userId: user.id
        }, {
            onSuccess: () => {
                setTelegramUsername("");
                alert("Telegram linked! (Mock)");
            }
        });
    };

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-violet-500/20">
                    {user.display_name?.charAt(0).toUpperCase() || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        {user.display_name}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
              ${user.tier === UserTier.VIP || user.tier === UserTier.ELITE ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                user.tier === UserTier.TRUSTED ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-500/50' :
                                    'bg-orange-900/40 text-orange-400 border border-orange-700/50'
                            }`}>
                            {TIER_LABELS[user.tier] || "Member"}
                        </span>
                        <span className="text-zinc-500 text-sm">
                            Joined {new Date(user.created_at || Date.now()).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Telegram Linking */}
                    {isOwnProfile && !user.telegram_username && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-md">
                            <p className="text-sm text-blue-300 mb-2">Link your Telegram to sync stats & earn reputation!</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="@username"
                                    className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                                    value={telegramUsername}
                                    onChange={(e) => setTelegramUsername(e.target.value)}
                                />
                                <button
                                    onClick={handleLink}
                                    disabled={linkTelegramMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition disabled:opacity-50"
                                >
                                    {linkTelegramMutation.isPending ? "Linking..." : "Link"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="flex gap-6 text-center">
                    <div>
                        <div className="text-2xl font-bold text-white">{user.reputation_score}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Reputation</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{user.total_requests}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Requests</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
