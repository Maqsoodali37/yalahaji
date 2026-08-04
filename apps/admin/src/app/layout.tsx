import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Yala Haji — Admin',
  description: 'Admin dashboard for Yala Haji',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f4f5' }}>
        {children}
      </body>
    </html>
  )
}
