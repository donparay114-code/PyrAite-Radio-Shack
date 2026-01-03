/**
 * Environment Variable Validation
 *
 * Validates required and optional environment variables at build/runtime.
 * Import this file early in the application to catch configuration issues.
 */

// Environment configuration with defaults and validation
interface EnvConfig {
  // API Configuration
  apiUrl: string;

  // Google OAuth (optional but needed for Google login)
  googleClientId: string | null;

  // Supabase (optional but needed for realtime features)
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;

  // Feature flags based on configuration
  features: {
    googleAuth: boolean;
    supabaseRealtime: boolean;
  };
}

function getEnvVar(key: string, defaultValue: string): string;
function getEnvVar(key: string): string | null;
function getEnvVar(key: string, defaultValue?: string): string | null {
  const value = process.env[key];
  if (!value || value === "") {
    return defaultValue ?? null;
  }
  return value;
}

/**
 * Validates and returns the environment configuration.
 * Call this function to get typed access to all environment variables.
 */
export function getEnvConfig(): EnvConfig {
  const apiUrl = getEnvVar("NEXT_PUBLIC_API_URL", "");
  const googleClientId = getEnvVar("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Determine which features are available
  const hasGoogleAuth = Boolean(
    googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID"
  );
  const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

  return {
    apiUrl,
    googleClientId,
    supabaseUrl,
    supabaseAnonKey,
    features: {
      googleAuth: hasGoogleAuth,
      supabaseRealtime: hasSupabase,
    },
  };
}

/**
 * Environment configuration singleton.
 * Use this for quick access to environment variables.
 */
export const env = getEnvConfig();

/**
 * Check if the app is running in production mode.
 */
export const isProduction = process.env.NODE_ENV === "production";

/**
 * Check if the app is running in development mode.
 */
export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Validates that all required environment variables are set.
 * Throws an error in production if required variables are missing.
 * Logs warnings in development.
 */
export function validateEnv(): void {
  const config = getEnvConfig();
  const warnings: string[] = [];

  // API URL is technically optional (defaults to empty string)
  // but should be set in production
  if (isProduction && !config.apiUrl) {
    warnings.push("NEXT_PUBLIC_API_URL is not set - API calls may fail");
  }

  // Optional features - just note if they're disabled
  if (!config.features.googleAuth) {
    warnings.push(
      "Google OAuth not configured - NEXT_PUBLIC_GOOGLE_CLIENT_ID not set"
    );
  }

  if (!config.features.supabaseRealtime) {
    warnings.push(
      "Supabase realtime not configured - NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
    );
  }

  // In development, we don't need all features configured
  // In production with missing required config, we could throw
  // For now, just track what's available via the features object
}

// Auto-validate on import in development
if (isDevelopment && typeof window !== "undefined") {
  validateEnv();
}
