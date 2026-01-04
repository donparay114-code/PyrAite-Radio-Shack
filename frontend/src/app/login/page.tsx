"use client";

import { useAuth } from "@/providers/AuthProvider";
import { GoogleLoginBtn } from "@/components/auth/GoogleLoginBtn";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { X, Mail, Lock, User, Eye, EyeOff, Users, Music, Sparkles, Clock, MessageCircle } from "lucide-react";
import Image from "next/image";
import { GlassCard, Badge } from "@/components/ui";

type AuthTab = "signin" | "signup";

// Fake data for background UI
const fakeStats = [
    { icon: Users, label: "Listeners", value: "1,247", color: "cyan" },
    { icon: Music, label: "In Queue", value: "8", color: "violet" },
    { icon: Sparkles, label: "Generated Today", value: "156", color: "pink" },
    { icon: Clock, label: "Avg Wait", value: "~4 min", color: "orange" },
];

const fakeQueue = [
    { id: 1, prompt: "Lo-fi hip hop beats to study to", user: "DJ_Wave", votes: 12 },
    { id: 2, prompt: "Epic orchestral battle music", user: "SynthMaster", votes: 8 },
    { id: 3, prompt: "Chill acoustic guitar vibes", user: "MelodyMaker", votes: 5 },
];

function LoginContent() {
    const { isAuthenticated, user, loginWithEmail, signupWithEmail, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/";

    // Form state
    const [activeTab, setActiveTab] = useState<AuthTab>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.isNewUser) {
                router.push("/profile/settings");
            } else {
                router.push(redirect);
            }
        }
    }, [isAuthenticated, user, router, redirect]);

    const handleLoginSuccess = (isNewUser?: boolean) => {
        if (isNewUser) {
            router.push("/profile/settings");
        } else {
            router.push(redirect);
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await loginWithEmail(email, password);
            if (result.success) {
                handleLoginSuccess(result.isNewUser);
            } else {
                setError(result.error || "Sign in failed");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!displayName.trim()) {
            setError("Display name is required");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await signupWithEmail(email, password, displayName);
            if (result.success) {
                handleLoginSuccess(true);
            } else {
                setError(result.error || "Sign up failed");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full px-4 py-3 pl-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-md w-full bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl shadow-violet-500/20"
        >
            {/* Gradient border glow effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-cyan-500/30 rounded-2xl blur-sm -z-10" />

            {/* Close button */}
            <button
                type="button"
                onClick={() => router.push("/")}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close"
            >
                <X size={20} />
            </button>

            {/* Header with Logo */}
            <div className="mb-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 mx-auto mb-2 relative"
                >
                    <Image
                        src="/logo.png"
                        alt="PyrAite Radio"
                        fill
                        className="object-contain rounded-xl"
                        priority
                    />
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent mb-2"
                >
                    {activeTab === "signin" ? "Welcome Back" : "Join the Crew"}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-zinc-400 text-sm"
                >
                    {activeTab === "signin"
                        ? "Sign in to control the radio and build your reputation."
                        : "Create your account and start requesting songs."
                    }
                </motion.p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => { setActiveTab("signin"); setError(null); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "signin"
                            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    Sign In
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab("signup"); setError(null); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "signup"
                            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    Sign Up
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Sign In Form */}
            {activeTab === "signin" && (
                <motion.form
                    key="signin"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleEmailSignIn}
                    className="space-y-4"
                >
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <motion.button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                    >
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </motion.button>
                </motion.form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
                <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleEmailSignUp}
                    className="space-y-4"
                >
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Display name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password (min. 8 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputClass}
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <motion.button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                    >
                        {isSubmitting ? "Creating account..." : "Create Account"}
                    </motion.button>
                </motion.form>
            )}

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-zinc-900/95 text-zinc-500">Or continue with</span>
                </div>
            </div>

            {/* Google Login */}
            <div className="flex justify-center">
                <GoogleLoginBtn onLoginSuccess={handleLoginSuccess} />
            </div>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
            />
        </motion.div>
    );
}

// Background home page UI mockup
function BackgroundUI() {
    const colorMap: Record<string, string> = {
        cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400",
        violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
        pink: "from-pink-500/20 to-pink-600/10 border-pink-500/20 text-pink-400",
        orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400",
    };

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden">
            {/* Ambient background glow effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[150px]" />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-cyan-600/30 rounded-full blur-[150px]" />
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-orange-600/15 rounded-full blur-[100px]" />
            </div>

            {/* Header bar mockup - full width */}
            <div className="absolute top-0 left-0 right-0 h-16 border-b border-white/5 bg-black/50 flex items-center px-6 gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                    <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
                </div>
                <span className="text-white font-semibold text-lg">PyrAite Radio</span>
                <Badge variant="violet" size="sm" className="ml-2">LIVE</Badge>
                <div className="flex-1" />
                <div className="flex items-center gap-4">
                    <div className="h-9 w-32 rounded-lg bg-white/5" />
                    <div className="h-9 w-24 rounded-lg bg-violet-600/50" />
                </div>
            </div>

            {/* Main content area - absolute positioning for full coverage */}
            <div className="absolute top-16 left-0 right-0 bottom-0 p-6 overflow-hidden">
                {/* Stats row - full width */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {fakeStats.map((stat, i) => (
                        <GlassCard key={i} noAnimation className={`bg-gradient-to-br ${colorMap[stat.color]} p-4`}>
                            <div className="flex items-center gap-3">
                                <stat.icon className="w-5 h-5" />
                                <div>
                                    <p className="text-xs text-zinc-400">{stat.label}</p>
                                    <p className="text-lg font-bold text-white">{stat.value}</p>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Two column layout - responsive grid */}
                <div className="grid grid-cols-[380px_1fr] gap-6 h-[calc(100%-120px)]">
                    {/* Left - Chat mockup */}
                    <GlassCard className="p-4 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Live Chat</h3>
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    Connected
                                </span>
                            </div>
                            <div className="ml-auto">
                                <Badge variant="default" size="sm">24 online</Badge>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 opacity-60">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="h-3 w-20 bg-white/10 rounded mb-1" />
                                        <div className="h-10 bg-white/5 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/10">
                            <div className="h-12 bg-white/5 rounded-xl" />
                        </div>
                    </GlassCard>

                    {/* Right - Now Playing & Queue */}
                    <div className="space-y-6 overflow-hidden">
                        {/* Now Playing mockup */}
                        <GlassCard className="p-6">
                            <div className="flex gap-6">
                                <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 flex items-center justify-center flex-shrink-0">
                                    <Music className="w-16 h-16 text-violet-400/50" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Badge variant="violet" size="sm" className="mb-3">NOW PLAYING</Badge>
                                    <h2 className="text-2xl font-bold text-white mb-2 truncate">Cosmic Voyage Through the Stars</h2>
                                    <p className="text-zinc-400 mb-4 text-sm">Ambient Electronic / Requested by DJ_Wave</p>
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        <span className="px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-400 text-xs">Synth</span>
                                        <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">Ambient</span>
                                        <span className="px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs">Chill</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/10 mb-2">
                                        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                                    </div>
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>1:42</span>
                                        <span>4:12</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Queue mockup */}
                        <GlassCard className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold">Up Next</h3>
                                <Badge variant="violet" size="sm">{fakeQueue.length} tracks</Badge>
                            </div>
                            <div className="space-y-2 opacity-70">
                                {fakeQueue.map((item, i) => (
                                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                                        <span className="text-zinc-500 text-sm w-5 text-center">{i + 1}</span>
                                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{item.prompt}</p>
                                            <p className="text-xs text-zinc-500">{item.user}</p>
                                        </div>
                                        <span className="text-xs text-green-400 font-medium">+{item.votes}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen relative overflow-hidden bg-black">
            {/* Background - actual home page UI mockup */}
            <BackgroundUI />

            {/* Blur overlay - fixed to cover entire viewport */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[5]" />

            {/* Floating login card */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <Suspense fallback={
                    <div className="animate-pulse max-w-md w-full h-[600px] bg-zinc-900/50 rounded-2xl backdrop-blur-xl" />
                }>
                    <LoginContent />
                </Suspense>
            </div>
        </main>
    );
}
