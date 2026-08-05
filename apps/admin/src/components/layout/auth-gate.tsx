'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth, canManage } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types'

/**
 * Blocks rendering until the session is restored. Redirects to /login
 * when there is no valid staff session.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { status, user, hydrate } = useAuth()

  React.useEffect(() => {
    if (status === 'idle') void hydrate()
  }, [status, hydrate])

  React.useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status !== 'authenticated' || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-ink-3">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Renders children only for the given roles. Use for pages that write to the
 * catalogue — the API enforces this too; this is for UX, not security.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles?: Role[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user } = useAuth()

  const allowed = roles ? !!user && roles.includes(user.role) : canManage(user?.role)

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <ShieldAlert className="h-8 w-8 text-ink-3 mb-3" aria-hidden />
        <h2 className="text-base font-bold text-ink">You don&apos;t have access to this page</h2>
        <p className="text-sm text-ink-3 mt-1 max-w-sm">
          Your role ({user?.role}) can&apos;t view this section. Ask an administrator
          if you need access.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
