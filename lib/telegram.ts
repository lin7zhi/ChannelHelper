export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  ready: () => void;
  expand: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred?: (
      type: "error" | "success" | "warning"
    ) => void;
  };
  showConfirm?: (
    message: string,
    callback: (confirmed: boolean) => void
  ) => void;
  close?: () => void;
  platform?: string;
  version?: string;
  colorScheme?: "light" | "dark";
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp || null;
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData || "";
}

export function getTelegramUser(): TelegramUser | undefined {
  const webApp = getTelegramWebApp();
  const unsafeUser = webApp?.initDataUnsafe?.user;

  if (unsafeUser) {
    return unsafeUser;
  }

  // Some Telegram clients populate initData before initDataUnsafe.  This is
  // display-only data; the backend must continue validating initData itself.
  try {
    const encodedUser = new URLSearchParams(webApp?.initData || "").get("user");
    return encodedUser ? (JSON.parse(encodedUser) as TelegramUser) : undefined;
  } catch {
    return undefined;
  }
}

export function isTelegramWebApp(): boolean {
  return Boolean(getTelegramInitData());
}

export function initializeTelegramWebApp(): TelegramWebApp | null {
  const tg = getTelegramWebApp();

  if (!tg) {
    return null;
  }

  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
  } catch (error) {
    console.warn("Telegram WebApp 初始化失败:", error);
  }

  return tg;
}
