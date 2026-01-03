/**
 * User-friendly error messages with actionable suggestions
 */

export interface UserFriendlyError {
  title: string;
  description: string;
  action?: string;
}

/**
 * Maps technical error types to user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // Authentication errors
  AUTH_FAILED: {
    title: "Login unsuccessful",
    description: "We couldn't sign you in. Please check your credentials and try again.",
    action: "Try signing in again",
  },
  AUTH_GOOGLE_FAILED: {
    title: "Google sign-in failed",
    description: "We couldn't connect to your Google account. This might be a temporary issue.",
    action: "Please try again or use another sign-in method",
  },
  AUTH_TELEGRAM_FAILED: {
    title: "Telegram linking failed",
    description: "We couldn't link your Telegram account. Make sure you're logged into Telegram.",
    action: "Try again or contact support if the issue persists",
  },
  AUTH_EXPIRED: {
    title: "Session expired",
    description: "Your session has ended for security reasons.",
    action: "Please sign in again to continue",
  },

  // Network errors
  NETWORK_ERROR: {
    title: "Connection problem",
    description: "We're having trouble connecting to the server. Check your internet connection.",
    action: "Try again when you're online",
  },
  NETWORK_TIMEOUT: {
    title: "Request timed out",
    description: "The server is taking too long to respond. This might be temporary.",
    action: "Please wait a moment and try again",
  },
  SERVER_ERROR: {
    title: "Server error",
    description: "Something went wrong on our end. We're working to fix it.",
    action: "Please try again in a few minutes",
  },

  // Music generation errors
  GENERATION_FAILED: {
    title: "Song generation failed",
    description: "We couldn't create your song. The AI might be busy or there was a technical issue.",
    action: "Try again with a simpler prompt or wait a few minutes",
  },
  GENERATION_QUEUE_FULL: {
    title: "Queue is full",
    description: "The song generation queue is currently at capacity.",
    action: "Please try again later when the queue has more space",
  },
  GENERATION_RATE_LIMITED: {
    title: "Slow down!",
    description: "You've made too many requests. Please wait before trying again.",
    action: "Try again in a few minutes",
  },

  // Audio playback errors
  AUDIO_LOAD_FAILED: {
    title: "Audio couldn't load",
    description: "The audio file failed to load. The stream might be temporarily unavailable.",
    action: "Refresh the page or try another track",
  },
  AUDIO_PLAYBACK_ERROR: {
    title: "Playback error",
    description: "There was a problem playing the audio. Check your device's audio settings.",
    action: "Try refreshing or check your volume settings",
  },

  // Chat errors
  CHAT_SEND_FAILED: {
    title: "Message not sent",
    description: "Your message couldn't be delivered. Check your connection.",
    action: "Click to retry sending",
  },
  CHAT_DISCONNECTED: {
    title: "Chat disconnected",
    description: "You've been disconnected from the chat. Reconnecting...",
    action: "Wait for reconnection or refresh the page",
  },

  // Form validation errors
  VALIDATION_REQUIRED: {
    title: "Required field",
    description: "Please fill in this field to continue.",
  },
  VALIDATION_PROMPT_EMPTY: {
    title: "Description needed",
    description: "Tell us what kind of song you'd like to create.",
    action: "Add a description for your song",
  },
  VALIDATION_PROMPT_TOO_LONG: {
    title: "Description too long",
    description: "Please shorten your description to under 500 characters.",
    action: "Remove some details or split into multiple requests",
  },

  // Generic fallback
  UNKNOWN: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    action: "Refresh the page if the problem continues",
  },
};

/**
 * Get a user-friendly error message from an error
 */
export function getUserFriendlyError(
  error: unknown,
  fallbackKey: keyof typeof ERROR_MESSAGES = "UNKNOWN"
): UserFriendlyError {
  // Check if it's already a UserFriendlyError
  if (isUserFriendlyError(error)) {
    return error;
  }

  // Check for specific error messages to map
  const errorMessage = getErrorMessage(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Map common error patterns to friendly messages
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (lowerMessage.includes("timeout")) {
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  }
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
    return ERROR_MESSAGES.AUTH_EXPIRED;
  }
  if (lowerMessage.includes("rate limit") || lowerMessage.includes("429")) {
    return ERROR_MESSAGES.GENERATION_RATE_LIMITED;
  }
  if (lowerMessage.includes("500") || lowerMessage.includes("server")) {
    return ERROR_MESSAGES.SERVER_ERROR;
  }
  if (lowerMessage.includes("generation") || lowerMessage.includes("generate")) {
    return ERROR_MESSAGES.GENERATION_FAILED;
  }

  // Return fallback
  return ERROR_MESSAGES[fallbackKey] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

/**
 * Type guard for UserFriendlyError
 */
function isUserFriendlyError(error: unknown): error is UserFriendlyError {
  return (
    error !== null &&
    typeof error === "object" &&
    "title" in error &&
    "description" in error &&
    typeof (error as UserFriendlyError).title === "string" &&
    typeof (error as UserFriendlyError).description === "string"
  );
}

/**
 * Format error for toast notifications
 */
export function formatErrorForToast(error: unknown, fallbackKey?: keyof typeof ERROR_MESSAGES): {
  message: string;
  description: string;
} {
  const friendly = getUserFriendlyError(error, fallbackKey);
  return {
    message: friendly.title,
    description: friendly.action || friendly.description,
  };
}
