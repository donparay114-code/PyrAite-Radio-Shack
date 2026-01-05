"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Sparkles, Music, Mic2, Loader2 } from "lucide-react";
import { GlassCard, GlowButton, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequestData) => Promise<void>;
}

interface RequestData {
  prompt: string;
  genre: string | null;
  isInstrumental: boolean;
  styleTags: string[];
}

const GENRES = [
  "Pop",
  "Rock",
  "Hip Hop",
  "Electronic",
  "Jazz",
  "Classical",
  "R&B",
  "Country",
  "Metal",
  "Indie",
  "Lofi",
  "Ambient",
];

const STYLE_TAGS = [
  "Upbeat",
  "Chill",
  "Energetic",
  "Melancholic",
  "Dreamy",
  "Aggressive",
  "Romantic",
  "Nostalgic",
  "Funky",
  "Epic",
];

export function RequestModal({ isOpen, onClose, onSubmit }: RequestModalProps) {
  const [provider, setProvider] = useState("sunoapi");
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
          ? [...prev, tag]
          : prev
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a song description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If we passed an onSubmit prop that handles everything, keep using it?
      // But user wants direct generation from modal. We'll use the API directly here.

      const fullPrompt = [
        prompt,
        genre && `Genre: ${genre}`,
        selectedTags.length > 0 && `Style: ${selectedTags.join(", ")}`
      ].filter(Boolean).join(". ");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/generate/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider,
          is_instrumental: isInstrumental,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      onClose();
      // Reset form
      setPrompt("");
      setGenre(null);
      setIsInstrumental(false);
      setSelectedTags([]);

      // Notify parent? (Optional but good practice)
      if (onSubmit) {
        // We can still call onSubmit to maybe refresh the list or show a toast
        // But the actual generation happens here now.
        await onSubmit({
          prompt: fullPrompt,
          genre,
          isInstrumental,
          styleTags: selectedTags
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate song");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg"
          >
            <GlassCard variant="elevated" className="overflow-visible">
              {/* Glow effect */}
              <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-2xl opacity-50 pointer-events-none" />

              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Request a Song</h2>
                      <p className="text-sm text-text-muted">Describe your perfect track</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="space-y-5">
                  {/* Prompt input */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Song Description
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the song you want... e.g., 'A dreamy synthwave track about summer nights'"
                      rows={3}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-white/5 border border-white/10",
                        "text-white placeholder:text-text-muted",
                        "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50",
                        "resize-none transition-all"
                      )}
                      maxLength={500}
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-text-muted">
                        Be specific for better results
                      </span>
                      <span className="text-xs text-text-muted">
                        {prompt.length}/500
                      </span>
                    </div>
                  </div>

                  {/* Genre selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Genre (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((g) => (
                        <motion.button
                          key={g}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setGenre(genre === g ? null : g)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            genre === g
                              ? "bg-violet-500/30 border border-violet-500/50 text-violet-300"
                              : "bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10"
                          )}
                        >
                          {g}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Style tags */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Mood/Style (up to 3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_TAGS.map((tag) => (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleTag(tag)}
                          disabled={selectedTags.length >= 3 && !selectedTags.includes(tag)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            selectedTags.includes(tag)
                              ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-300"
                              : "bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10",
                            selectedTags.length >= 3 &&
                            !selectedTags.includes(tag) &&
                            "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {tag}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Instrumental toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      {isInstrumental ? (
                        <Music className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Mic2 className="w-5 h-5 text-violet-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {isInstrumental ? "Instrumental" : "With Vocals"}
                        </p>
                        <p className="text-xs text-text-muted">
                          {isInstrumental
                            ? "No vocals, music only"
                            : "AI-generated lyrics and vocals"}
                        </p>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsInstrumental(!isInstrumental)}
                      className={cn(
                        "relative w-12 h-7 rounded-full transition-colors",
                        isInstrumental ? "bg-cyan-500" : "bg-white/20"
                      )}
                    >
                      <motion.div
                        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg"
                        animate={{ left: isInstrumental ? "calc(100% - 24px)" : "4px" }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Provider selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Generation Provider
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "sunoapi", label: "SunoAPI", recommended: true },
                        { id: "goapi_udio", label: "GoAPI Udio", recommended: true },
                        { id: "mock", label: "Mock", recommended: false },
                      ].map((p) => (
                        <motion.button
                          key={p.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setProvider(p.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            provider === p.id
                              ? "bg-violet-500/30 border border-violet-500/50 text-violet-300"
                              : "bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10"
                          )}
                        >
                          {p.label}
                          {p.recommended && (
                            <span className="ml-1 text-xs text-green-400">✓</span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Submit button */}
                  <GlowButton
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isLoading}
                    isLoading={isLoading}
                    className="w-full"
                    size="lg"
                    leftIcon={<Sparkles className="w-5 h-5" />}
                  >
                    {isLoading ? "Generating..." : "Generate & Add to Queue"}
                  </GlowButton>

                  {/* Info */}
                  <p className="text-xs text-text-muted text-center">
                    Your request will be reviewed and added to the queue.
                    Generation typically takes 1-3 minutes.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
