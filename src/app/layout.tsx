import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nine7 频道助手',
  description: '高级 Telegram 频道管理控制台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body className="bg-surface-0 text-text-primary antialiased noise">
        {children}
      </body>
    </html>
  )
}
