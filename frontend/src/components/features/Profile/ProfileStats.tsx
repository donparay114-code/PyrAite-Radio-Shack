
import { User } from "@/types";

interface ProfileStatsProps {
    user: User;
}

export function ProfileStats({ user }: ProfileStatsProps) {
    const stats = [
        { label: "Successful Requests", value: user.successful_requests, color: "text-emerald-400" },
        { label: "Success Rate", value: `${((user.success_rate || 0) * 100).toFixed(1)}%`, color: "text-blue-400" },
        { label: "Upvotes Received", value: user.total_upvotes_received, color: "text-pink-400" },
        { label: "Votes Given", value: (user.total_upvotes_given || 0) + (user.total_downvotes_given || 0), color: "text-violet-400" },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
                <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 hover:bg-zinc-900/60 transition duration-300">
                    <div className={`text-xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}
