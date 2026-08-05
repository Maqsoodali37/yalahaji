'use client'

import { useState, type ReactNode } from 'react'
import { AuthGate } from '@/components/layout/auth-gate'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useAuth } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar role={user?.role} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="lg:pl-60">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="p-4 sm:p-6 max-w-[1400px]">{children}</main>
      </div>
    </div>
  )
}
