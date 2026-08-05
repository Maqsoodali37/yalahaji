'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input, FormField } from '@/components/ui/field'

export default function LoginPage() {
  const router = useRouter()
  const { login, hydrate, status, error } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // If a valid token is already stored, skip the form.
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [status, router])

  const submitting = status === 'loading'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(identifier.trim(), password)
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* ─── Brand panel ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between bg-green text-white p-10">
        <div className="text-2xl">🕋</div>
        <div>
          <h1 className="serif text-4xl leading-tight">Yala Haji</h1>
          <p className="text-green-tint/80 mt-3 max-w-sm text-sm leading-relaxed">
            Manage your catalogue, fulfil orders, and keep stock moving — all from
            one dashboard.
          </p>
        </div>
        <p className="text-xs text-green-tint/50">
          Staff access only. All activity is recorded.
        </p>
      </aside>

      {/* ─── Form ────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-3xl mb-4">🕋</div>
          <h2 className="text-xl font-bold text-ink">Sign in to the dashboard</h2>
          <p className="text-sm text-ink-3 mt-1 mb-6">
            Use the phone number or email on your staff account.
          </p>

          {error && (
            <div
              className="flex items-start gap-2 rounded-md border border-alert/30 bg-red-50 px-3 py-2.5 mb-4"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-alert shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-alert">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Phone or email" htmlFor="identifier" required>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                placeholder="+923001234567 or you@yalahaji.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </FormField>

            <Button type="submit" className="w-full" loading={submitting} size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-xs text-ink-3 mt-6 text-center">
            Trouble signing in? Contact your system administrator.
          </p>
        </div>
      </div>
    </main>
  )
}
