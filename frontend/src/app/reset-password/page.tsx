"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useResetPassword } from "@/hooks/useApi";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPasswordMutation = useResetPassword();

  const inputClass = "w-full px-4 py-3 pl-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: "", color: "bg-zinc-700", width: "w-0" };
    if (pwd.length < 8) return { label: "Too short", color: "bg-red-500", width: "w-1/4" };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: "Weak", color: "bg-orange-500", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-green-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-400", width: "w-full" };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      setError("Password must contain at least one letter");
      return;
    }

    if (!/\d/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ token, new_password: password });
      setIsSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
      setError(errorMessage);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-violet-500/10">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-zinc-400 text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
        >
          Request New Link
        </Link>
        <div className="mt-6 pt-6 border-t border-white/5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-violet-500/10">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
          <p className="text-zinc-400 text-sm">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl shadow-violet-500/10">
      {/* Header */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg shadow-violet-500/20">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-zinc-400 text-sm">
          Create a strong password for your account.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
              minLength={8}
              disabled={resetPasswordMutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`} />
              </div>
              <p className={`text-xs mt-1 ${passwordStrength.color.replace('bg-', 'text-')}`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
            disabled={resetPasswordMutation.isPending}
          />
        </div>

        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-red-400 text-left flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Passwords don't match
          </p>
        )}

        <button
          type="submit"
          disabled={resetPasswordMutation.isPending || !password || !confirmPassword || password !== confirmPassword}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
        >
          {resetPasswordMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="animate-pulse max-w-md w-full h-[500px] bg-zinc-900 rounded-2xl" />
      }>
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}
