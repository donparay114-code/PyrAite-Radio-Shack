"use client";

import { useAuth } from "@/providers/AuthProvider";
import { GoogleLoginBtn } from "@/components/auth/GoogleLoginBtn";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { X } from "lucide-react";

function LoginContent() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/";

    useEffect(() => {
        if (isAuthenticated) {
            router.push(redirect);
        }
    }, [isAuthenticated, router, redirect]);

    return (
        <div className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-violet-500/10">
            <button
                onClick={() => router.push("/")}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close"
            >
                <X size={20} />
            </button>
            <div className="mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-violet-500/20">
                    🏴‍☠️
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                <p className="text-zinc-400">Sign in to control the radio, vote, and build your reputation.</p>
            </div>

            <div className="space-y-6">
                <GoogleLoginBtn />

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-zinc-900 text-zinc-500">Or</span>
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-800/50 border border-white/5 text-sm text-zinc-400">
                    Open in <span className="text-white font-medium">Telegram</span> for the full integrated experience.
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-black flex items-center justify-center p-4">
            <Suspense fallback={
                <div className="animate-pulse max-w-md w-full h-96 bg-zinc-900 rounded-2xl" />
            }>
                <LoginContent />
            </Suspense>
        </main>
    );
}
