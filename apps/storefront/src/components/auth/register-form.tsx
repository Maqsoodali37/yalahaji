'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export function RegisterForm({ locale }: { locale: string }) {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await register(name, phone, email, password)
    if (ok) router.push(`/${locale}/account`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-6 shadow-sm space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Full Name *</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); clearError() }}
            className="input-base"
            placeholder="Muhammad Ali"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); clearError() }}
            className="input-base"
            placeholder="+92 300 1234567"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="ali@example.com"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Password *</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError() }}
            className="input-base pe-10"
            placeholder="Min. 8 characters"
            minLength={8}
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

      <p className="text-xs text-stone">
        By creating an account you agree to our{' '}
        <Link href={`/${locale}/terms`} className="text-green hover:underline">
          Terms &amp; Conditions
        </Link>{' '}
        and{' '}
        <Link href={`/${locale}/returns`} className="text-green hover:underline">
          Return Policy
        </Link>
        .
      </p>

      <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 disabled:opacity-70">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {isLoading ? 'Creating account…' : 'Create Account'}
      </button>

      <div className="relative text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-white px-3 text-xs text-stone">or</span>
      </div>

      <button type="button" className="btn-outline w-full justify-center py-2.5 gap-2">
        <span className="text-lg">📱</span>
        Register with WhatsApp OTP
      </button>
    </form>
  )
}
