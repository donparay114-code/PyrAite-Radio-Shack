/**
 * Telegram WebApp SDK Integration
 *
 * This module provides type-safe access to the Telegram WebApp API
 * for authentication and user data within Telegram Mini Apps.
 */

// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: "default" | "ok" | "close" | "cancel" | "destructive";
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
}

// Extend Window interface
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Check if running inside Telegram WebApp
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
}

/**
 * Get the Telegram WebApp instance
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Get the current Telegram user
 */
export function getTelegramUser(): TelegramUser | null {
  const webapp = getTelegramWebApp();
  return webapp?.initDataUnsafe?.user ?? null;
}

/**
 * Get the init data string for backend validation
 */
export function getTelegramInitData(): string {
  const webapp = getTelegramWebApp();
  return webapp?.initData ?? "";
}

/**
 * Initialize the Telegram WebApp
 * Call this in your app's root component
 */
export function initTelegramWebApp(): void {
  const webapp = getTelegramWebApp();
  if (webapp) {
    // Signal that the app is ready
    webapp.ready();
    // Expand to full height
    webapp.expand();
  }
}

/**
 * Trigger haptic feedback
 */
export function hapticFeedback(
  type: "impact" | "notification" | "selection",
  style?: "light" | "medium" | "heavy" | "rigid" | "soft" | "error" | "success" | "warning"
): void {
  const webapp = getTelegramWebApp();
  if (!webapp?.HapticFeedback) return;

  switch (type) {
    case "impact":
      webapp.HapticFeedback.impactOccurred(style as "light" | "medium" | "heavy" | "rigid" | "soft" || "medium");
      break;
    case "notification":
      webapp.HapticFeedback.notificationOccurred(style as "error" | "success" | "warning" || "success");
      break;
    case "selection":
      webapp.HapticFeedback.selectionChanged();
      break;
  }
}

/**
 * Show a Telegram-native alert
 */
export function showTelegramAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.showAlert(message, resolve);
    } else {
      alert(message);
      resolve();
    }
  });
}

/**
 * Show a Telegram-native confirm dialog
 */
export function showTelegramConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.showConfirm(message, resolve);
    } else {
      resolve(confirm(message));
    }
  });
}

/**
 * Get theme colors from Telegram
 */
export function getTelegramTheme(): TelegramWebApp["themeParams"] | null {
  const webapp = getTelegramWebApp();
  return webapp?.themeParams ?? null;
}

/**
 * Check if user has Telegram Premium
 */
export function isTelegramPremium(): boolean {
  const user = getTelegramUser();
  return user?.is_premium ?? false;
}
