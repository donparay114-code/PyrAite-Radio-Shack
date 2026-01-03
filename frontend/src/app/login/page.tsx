"use client";

import { useAuth } from "@/providers/AuthProvider";
import { GoogleLoginBtn } from "@/components/auth/GoogleLoginBtn";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

type AuthTab = "signin" | "signup";

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

        // Validation
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
        <div className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-violet-500/10">
            {/* Close button */}
            <button
                onClick={() => router.push("/")}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close"
            >
                <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-violet-500/20">
                    🏴‍☠️
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    {activeTab === "signin" ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="text-zinc-400 text-sm">
                    {activeTab === "signin"
                        ? "Sign in to control the radio and build your reputation."
                        : "Join the community and start requesting songs."
                    }
                </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => { setActiveTab("signin"); setError(null); }}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "signin"
                            ? "bg-violet-600 text-white shadow-lg"
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
                            ? "bg-violet-600 text-white shadow-lg"
                            : "text-zinc-400 hover:text-white"
                    }`}
                >
                    Sign Up
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Sign In Form */}
            {activeTab === "signin" && (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                    <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                    >
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
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
                    <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
                    >
                        {isSubmitting ? "Creating account..." : "Create Account"}
                    </button>
                </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-zinc-900 text-zinc-500">Or continue with</span>
                </div>
            </div>

            {/* Google Login */}
            <div className="flex justify-center">
                <GoogleLoginBtn onLoginSuccess={handleLoginSuccess} />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-black flex items-center justify-center p-4">
            <Suspense fallback={
                <div className="animate-pulse max-w-md w-full h-[600px] bg-zinc-900 rounded-2xl" />
            }>
                <LoginContent />
            </Suspense>
        </main>
    );
}
