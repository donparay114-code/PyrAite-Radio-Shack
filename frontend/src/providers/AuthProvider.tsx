"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  getTelegramUser,
  getTelegramInitData,
  isTelegramWebApp,
  initTelegramWebApp,
  type TelegramUser,
} from "@/lib/telegram";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { UserTier } from "@/types";

/**
 * Validates that a value is a valid UserTier enum value
 */
function isValidUserTier(value: unknown): value is UserTier {
  return (
    typeof value === "string" &&
    Object.values(UserTier).includes(value as UserTier)
  );
}

/**
 * Safely parses a UserTier from an unknown value, returning a default if invalid
 */
function parseUserTier(value: unknown, defaultTier: UserTier = UserTier.NEW): UserTier {
  return isValidUserTier(value) ? value : defaultTier;
}

/**
 * API response shape for auth endpoints
 */
interface AuthApiResponse {
  id?: number;
  user_id?: number;
  telegram_id?: number;
  telegram_username?: string | null;
  email?: string;
  display_name?: string;
  is_premium?: boolean;
  tier?: string;
  reputation_score?: number;
  is_new_user?: boolean;
  token?: string;
}

/**
 * Safely extracts user ID from API response
 */
function getUserIdFromResponse(data: AuthApiResponse): number {
  const id = data.id ?? data.user_id;
  if (typeof id !== "number") {
    throw new Error("Invalid user ID in response");
  }
  return id;
}

// Auth state types
export interface AuthUser {
  id: number;
  telegramId: number | null;
  username: string | null;
  firstName: string;
  lastName: string | null;
  isPremium: boolean;
  photoUrl: string | null;
  isNewUser?: boolean;
  tier?: UserTier;
  reputation_score?: number;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTelegramApp: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Default context value
const defaultContext: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isTelegramApp: false,
  error: null,
  login: async () => { },
  loginWithGoogle: async () => { },
  logout: () => { },
  refreshUser: async () => { },
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultContext);

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isTelegramApp: false,
    error: null,
  });

  // Convert Telegram user to our AuthUser format
  const telegramUserToAuthUser = (tgUser: TelegramUser, dbUserId?: number): AuthUser => ({
    id: dbUserId ?? tgUser.id,
    telegramId: tgUser.id,
    username: tgUser.username ?? null,
    firstName: tgUser.first_name,
    lastName: tgUser.last_name ?? null,
    isPremium: tgUser.is_premium ?? false,
    photoUrl: tgUser.photo_url ?? null,
    tier: UserTier.NEW,
    reputation_score: 0,
  });

  // Validate init data with backend
  const validateWithBackend = useCallback(async (initData: string): Promise<AuthUser | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ init_data: initData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Authentication failed");
      }

      const data: AuthApiResponse = await response.json();
      return {
        id: getUserIdFromResponse(data),
        telegramId: data.telegram_id ?? null,
        username: data.telegram_username ?? null,
        firstName: data.display_name?.split(' ')[0] ?? "User",
        lastName: null,
        isPremium: data.is_premium ?? false,
        photoUrl: null,
        tier: parseUserTier(data.tier),
        reputation_score: data.reputation_score ?? 0,
      };
    } catch {
      // Backend validation failed - will fallback to client-side data
      return null;
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`${API_BASE}/api/auth/google/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credential }),
      });

      if (!response.ok) {
        throw new Error("Google authentication failed");
      }

      const data: AuthApiResponse = await response.json();

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setState({
        user: {
          id: getUserIdFromResponse(data),
          telegramId: null,
          username: data.telegram_username ?? data.email ?? null,
          firstName: data.display_name ?? "User",
          lastName: null,
          isPremium: data.is_premium ?? false,
          photoUrl: null,
          isNewUser: data.is_new_user ?? false,
          tier: parseUserTier(data.tier),
          reputation_score: data.reputation_score ?? 0,
        },
        isLoading: false,
        isAuthenticated: true,
        isTelegramApp: false,
        error: null,
      });
    } catch (error) {
      // Google login error - update state with error message
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Google login failed"
      }));
    }
  }, []);

  // Login function
  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (isTelegramWebApp()) {
        const initData = getTelegramInitData();
        const tgUser = getTelegramUser();

        if (!initData || !tgUser) {
          throw new Error("Telegram data not available");
        }

        // Try to validate with backend
        const validatedUser = await validateWithBackend(initData);

        if (validatedUser) {
          setState({
            user: validatedUser,
            isLoading: false,
            isAuthenticated: true,
            isTelegramApp: true,
            error: null,
          });
        } else {
          // Fallback to client-side user data (less secure, but functional)
          setState({
            user: telegramUserToAuthUser(tgUser),
            isLoading: false,
            isAuthenticated: true,
            isTelegramApp: true,
            error: "Backend validation unavailable, using client data",
          });
        }
      } else {
        // Not in Telegram - check if we have a persisted session? 
        const token = localStorage.getItem("auth_token");
        if (token) {
           try {
              const response = await fetch(`${API_BASE}/api/auth/google/me`, {
                 headers: {
                    "Authorization": `Bearer ${token}`
                 }
              });

              if (response.ok) {
                 const data: AuthApiResponse = await response.json();
                 setState({
                    user: {
                       id: getUserIdFromResponse(data),
                       telegramId: null,
                       username: data.telegram_username ?? null,
                       firstName: data.display_name ?? "User",
                       lastName: null,
                       isPremium: data.is_premium ?? false,
                       photoUrl: null,
                       isNewUser: false,
                       tier: parseUserTier(data.tier),
                       reputation_score: data.reputation_score ?? 0
                    },
                    isLoading: false,
                    isAuthenticated: true,
                    isTelegramApp: false,
                    error: null
                 });
                 return;
              } else {
                 // Token invalid/expired
                 localStorage.removeItem("auth_token");
              }
           } catch {
              // Token verification failed - clear invalid token
              localStorage.removeItem("auth_token");
           }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false, // Explicitly false unless we restore session
          isTelegramApp: false,
        }));
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isTelegramApp: isTelegramWebApp(),
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  }, [validateWithBackend]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isTelegramApp: isTelegramWebApp(),
      error: null,
    });
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (state.isAuthenticated) {
        if (state.isTelegramApp) {
           await login();
        } else {
           // Refresh Google/Session auth
           const token = localStorage.getItem("auth_token");
           if (token) {
              try {
                  const response = await fetch(`${API_BASE}/api/auth/google/me`, {
                      headers: { "Authorization": `Bearer ${token}` }
                  });
                  if (response.ok) {
                      const data: AuthApiResponse = await response.json();
                      setState(prev => ({
                          ...prev,
                          user: prev.user ? {
                              ...prev.user,
                              id: getUserIdFromResponse(data),
                              username: data.telegram_username ?? prev.user.username,
                              firstName: data.display_name ?? prev.user.firstName,
                              tier: parseUserTier(data.tier, prev.user.tier),
                              reputation_score: data.reputation_score ?? prev.user.reputation_score ?? 0,
                              isPremium: data.is_premium ?? prev.user.isPremium
                          } : null
                      }));
                  }
              } catch {
                  // Failed to refresh user - state unchanged
              }
           }
        }
    }
  }, [state.isAuthenticated, state.isTelegramApp, login]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      // Initialize Telegram WebApp if available
      if (isTelegramWebApp()) {
        initTelegramWebApp();
      }

      // Attempt auto-login
      await login();
    };

    init();
  }, [login]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider
        value={{
          ...state,
          login,
          loginWithGoogle,
          logout,
          refreshUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

// Custom hook for using auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook to get just the user ID (convenience)
export function useUserId(): number | null {
  const { user } = useAuth();
  return user?.id ?? null;
}

// Hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
