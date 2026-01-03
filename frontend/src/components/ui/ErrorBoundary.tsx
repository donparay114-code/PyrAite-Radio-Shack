"use client";

import { Component, ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { GlowButton } from "./GlowButton";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Name of the component/section for error reporting */
  name?: string;
  /** Callback when an error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components.
 * Displays a user-friendly error message with retry option.
 *
 * @example
 * <ErrorBoundary name="NowPlaying">
 *   <NowPlaying song={song} />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call optional error callback for logging/reporting
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {this.props.name ? `Error in ${this.props.name}` : "Something went wrong"}
              </h3>
              <p className="text-sm text-text-muted mt-1">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <GlowButton
              variant="secondary"
              size="sm"
              onClick={this.handleRetry}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </GlowButton>
          </div>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}

/**
 * A simpler error boundary for smaller components that just shows
 * an inline error message without the full card treatment.
 */
export class InlineErrorBoundary extends Component<
  { children: ReactNode; fallbackText?: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallbackText?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {this.props.fallbackText || "Failed to load component"}
        </div>
      );
    }

    return this.props.children;
  }
}
