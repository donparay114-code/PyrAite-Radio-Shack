"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music, Loader2, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { GlassCard, GlowButton, easings } from "@/components/ui";

interface GenerateResponse {
    success: boolean;
    provider: string;
    job_id?: string;
    status: string;
    audio_url?: string;
    title?: string;
    error?: string;
}

export default function GeneratePage() {
    const [prompt, setPrompt] = useState("");
    const [provider, setProvider] = useState("sunoapi");
    const [isInstrumental, setIsInstrumental] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GenerateResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setResult(null);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/api/generate/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    provider,
                    is_instrumental: isInstrumental,
                }),
            });

            const data: GenerateResponse = await response.json();
            setResult(data);

            if (!data.success) {
                setError(data.error || "Generation failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Network error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easings.smooth }}
            >
                <h1 className="text-3xl font-bold text-white mb-2">
                    🎵 Music Generator Test
                </h1>
                <p className="text-text-muted">
                    Test Udio music generation directly from the frontend
                </p>
            </motion.div>

            {/* Generator Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: easings.smooth }}
            >
                <GlassCard className="p-6 space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">
                            Music Prompt
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., uplifting synthwave with retro vibes"
                            className="w-full h-24 px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                       text-white placeholder:text-text-muted resize-none
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Provider Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Provider</label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: "sunoapi", label: "SunoAPI", recommended: true },
                                { id: "goapi_udio", label: "GoAPI Udio", recommended: true },
                                { id: "mock", label: "Mock", recommended: false },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setProvider(p.id)}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${provider === p.id
                                            ? "bg-violet-500 text-white"
                                            : "bg-white/5 text-text-muted hover:bg-white/10 hover:text-white"
                                        } disabled:opacity-50`}
                                >
                                    {p.label}
                                    {p.recommended && <span className="ml-1 text-green-300">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Instrumental Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsInstrumental(!isInstrumental)}
                            disabled={isLoading}
                            aria-label="Toggle Instrumental"
                            className={`w-12 h-6 rounded-full transition-colors ${isInstrumental ? "bg-violet-500" : "bg-white/20"
                                }`}
                        >
                            <motion.div
                                className="w-5 h-5 bg-white rounded-full shadow"
                                animate={{ x: isInstrumental ? 26 : 2 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </button>
                        <span className="text-sm text-white">Instrumental</span>
                    </div>

                    {/* Generate Button */}
                    <GlowButton
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isLoading}
                        className="w-full"
                        size="lg"
                        leftIcon={
                            isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Music className="w-5 h-5" />
                            )
                        }
                    >
                        {isLoading ? "Generating..." : "Generate Music"}
                    </GlowButton>
                </GlassCard>
            </motion.div>

            {/* Result */}
            {(result || error) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: easings.smooth }}
                >
                    <GlassCard
                        className={`p-6 ${result?.success
                            ? "border-green-500/30"
                            : "border-red-500/30"
                            }`}
                    >
                        {/* Status Header */}
                        <div className="flex items-center gap-3 mb-4">
                            {result?.success ? (
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            )}
                            <h3 className="text-lg font-semibold text-white">
                                {result?.success ? "Generation Complete!" : "Generation Failed"}
                            </h3>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 text-sm">
                            {result && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Provider:</span>
                                        <span className="text-white">{result.provider}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">Status:</span>
                                        <span className="text-white">{result.status}</span>
                                    </div>
                                    {result.job_id && (
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Job ID:</span>
                                            <span className="text-white font-mono text-xs">
                                                {result.job_id.substring(0, 20)}...
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Audio Player */}
                            {result?.audio_url && (
                                <div className="mt-4 space-y-3">
                                    <audio
                                        controls
                                        className="w-full"
                                        src={result.audio_url}
                                    >
                                        Your browser does not support audio.
                                    </audio>
                                    <a
                                        href={result.audio_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2 
                             rounded-lg bg-white/5 hover:bg-white/10 transition-colors
                             text-white text-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Audio
                                    </a>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {/* Instructions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <GlassCard className="p-4 border-violet-500/20">
                    <h4 className="text-sm font-medium text-violet-400 mb-2">
                        💡 Tips
                    </h4>
                    <ul className="text-xs text-text-muted space-y-1">
                        <li>• <strong>SunoAPI</strong> ✓: Suno via API key ($0.032/song)</li>
                        <li>• <strong>GoAPI Udio</strong> ✓: Udio via API key ($0.05/song)</li>
                        <li>• <strong>Mock</strong>: Test mode (no actual generation)</li>
                    </ul>
                </GlassCard>
            </motion.div>
        </div>
    );
}
