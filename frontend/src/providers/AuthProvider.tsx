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

export interface AuthResult {
  success: boolean;
  isNewUser?: boolean;
  error?: string;
}

export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<AuthResult>;
  loginWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<AuthResult>;
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
  loginWithGoogle: async () => ({ success: false }),
  loginWithEmail: async () => ({ success: false }),
  signupWithEmail: async () => ({ success: false }),
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

      const data = await response.json();
      return {
        id: data.id, // Response uses id, not user_id
        telegramId: data.telegram_id,
        username: data.telegram_username, // Map telegram_username to username
        firstName: data.display_name.split(' ')[0], // Approximate
        lastName: null, // response doesn't strictly have last_name separately if we stick to display_name
        isPremium: data.is_premium,
        photoUrl: null, // API might not return photoUrl if it's not stored
        tier: data.tier as UserTier,
        reputation_score: data.reputation_score,
      };
    } catch (error) {
      console.error("Backend validation failed:", error);
      return null;
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<{ success: boolean; isNewUser?: boolean }> => {
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

      const data = await response.json();

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setState({
        user: {
          id: data.user_id, // Response uses user_id
          telegramId: null,
          username: data.telegram_username || data.email, // Fallback
          firstName: data.display_name,
          lastName: null,
          isPremium: data.is_premium || false,
          photoUrl: null,
          isNewUser: data.is_new_user,
          tier: data.tier as UserTier,
          reputation_score: data.reputation_score,
        },
        isLoading: false,
        isAuthenticated: true,
        isTelegramApp: false,
        error: null,
      });

      return { success: true, isNewUser: data.is_new_user };
    } catch (error) {
      console.error("Google login error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Google login failed"
      }));
      return { success: false, error: error instanceof Error ? error.message : "Google login failed" };
    }
  }, []);

  // Email signup
  const signupWithEmail = useCallback(async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`${API_BASE}/api/auth/email/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setState({
        user: {
          id: data.user_id,
          telegramId: null,
          username: data.email,
          firstName: data.display_name,
          lastName: null,
          isPremium: data.is_premium || false,
          photoUrl: null,
          isNewUser: true,
          tier: data.tier as UserTier,
          reputation_score: data.reputation_score,
        },
        isLoading: false,
        isAuthenticated: true,
        isTelegramApp: false,
        error: null,
      });

      return { success: true, isNewUser: true };
    } catch (error) {
      console.error("Email signup error:", error);
      const errorMsg = error instanceof Error ? error.message : "Signup failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  // Email login
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`${API_BASE}/api/auth/email/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setState({
        user: {
          id: data.user_id,
          telegramId: null,
          username: data.email,
          firstName: data.display_name,
          lastName: null,
          isPremium: data.is_premium || false,
          photoUrl: null,
          isNewUser: false,
          tier: data.tier as UserTier,
          reputation_score: data.reputation_score,
        },
        isLoading: false,
        isAuthenticated: true,
        isTelegramApp: false,
        error: null,
      });

      return { success: true, isNewUser: false };
    } catch (error) {
      console.error("Email login error:", error);
      const errorMsg = error instanceof Error ? error.message : "Login failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg
      }));
      return { success: false, error: errorMsg };
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
              const data = await response.json();
              setState({
                user: {
                  id: data.user_id,
                  telegramId: null,
                  username: data.telegram_username,
                  firstName: data.display_name,
                  lastName: null,
                  isPremium: data.is_premium || false,
                  photoUrl: null,
                  isNewUser: false,
                  tier: data.tier as UserTier,
                  reputation_score: data.reputation_score
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
          } catch (e) {
            console.error("Token verification failed", e);
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
              const data = await response.json();
              setState((prev) => ({
                ...prev,
                user: {
                  ...prev.user!,
                  id: data.user_id,
                  telegramId: null,
                  username: data.telegram_username,
                  firstName: data.display_name,
                  tier: data.tier as UserTier,
                  reputation_score: data.reputation_score,
                  isPremium: data.is_premium || false,
                }
              }));
            } else if (response.status === 401) {
              // Token expired
              localStorage.removeItem("auth_token");
              setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                isTelegramApp: false,
                error: "Session expired",
              });
            }
          } catch (e) {
            console.error("Failed to refresh user data", e);
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
          loginWithEmail,
          signupWithEmail,
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
