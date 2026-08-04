'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export function LoginForm({ locale }: { locale: string }) {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(phone, password)
    if (ok) router.push(`/${locale}/account`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-6 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); clearError() }}
          className="input-base"
          placeholder="+92 300 1234567"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-stone uppercase tracking-wider">Password</label>
          <Link href={`/${locale}/forgot-password`} className="text-xs text-green hover:underline">Forgot?</Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            className="input-base pe-10"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-stone hover:text-ink"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-alert font-medium">{error}</p>
      )}

      <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 disabled:opacity-70">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {isLoading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="relative text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-white px-3 text-xs text-stone">or continue with</span>
      </div>

      <button type="button" className="btn-outline w-full justify-center py-2.5 gap-2">
        <span className="text-lg">📱</span>
        Continue with WhatsApp OTP
      </button>
    </form>
  )
}
