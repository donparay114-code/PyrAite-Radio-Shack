
import { useUserRequests } from "@/hooks/useApi";
import { formatDistanceToNow } from "date-fns";

interface RequestHistoryProps {
    userId: number;
}

export function RequestHistory({ userId }: RequestHistoryProps) {
    const { data: requests, isLoading } = useUserRequests(userId);

    if (isLoading) {
        return <div className="text-zinc-500 text-center py-8">Loading history...</div>;
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                <p className="text-zinc-500">No requests yet. Be the first to request a song!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
                Request History
            </h3>

            <div className="grid gap-3">
                {requests.map((req) => (
                    <div key={req.id} className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-white/10 transition">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-emerald-500' :
                                        req.status === 'pending' || req.status === 'queued' ? 'bg-yellow-500' :
                                            req.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                                    }`}></span>
                                <span className="text-xs font-mono text-zinc-500 uppercase">{req.status}</span>
                                <span className="text-xs text-zinc-600">•</span>
                                <span className="text-xs text-zinc-500">{formatDistanceToNow(new Date(req.requested_at))} ago</span>
                            </div>
                            <p className="text-sm text-zinc-300 font-medium truncate">{req.original_prompt}</p>
                            {req.genre_hint && <p className="text-xs text-zinc-500 mt-1">{req.genre_hint}</p>}
                        </div>

                        <div className="flex flex-col items-end gap-1 px-4 border-l border-white/5 ml-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest">Score</div>
                            <div className="text-lg font-bold text-violet-400">{req.priority_score.toFixed(0)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
