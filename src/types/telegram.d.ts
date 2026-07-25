interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation: () => void
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
    }
  }
  showConfirm: (msg: string, cb: (ok: boolean) => void) => void
  HapticFeedback: {
    impactOccurred: (style: string) => void
    notificationOccurred: (type: string) => void
  }
  themeParams: Record<string, string>
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}
