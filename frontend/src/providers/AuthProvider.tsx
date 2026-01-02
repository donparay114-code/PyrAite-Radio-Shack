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

// Auth state types
export interface AuthUser {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  isPremium: boolean;
  photoUrl: string | null;
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
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultContext);

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        id: data.user_id,
        telegramId: data.telegram_id,
        username: data.username,
        firstName: data.first_name,
        lastName: data.last_name,
        isPremium: data.is_premium,
        photoUrl: data.photo_url,
      };
    } catch (error) {
      console.error("Backend validation failed:", error);
      return null;
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
        // Not in Telegram - use demo/guest mode
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          isTelegramApp: false,
          error: "Not running in Telegram WebApp",
        });
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
      await login();
    }
  }, [state.isAuthenticated, login]);

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
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
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
