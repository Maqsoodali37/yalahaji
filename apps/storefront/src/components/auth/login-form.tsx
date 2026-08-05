'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { validate, hasErrors, required, type FieldErrors } from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'

interface LoginValues {
  identifier: string
  password: string
}

/**
 * Only presence is checked. The field accepts a phone number *or* an email, so
 * a format rule here would have to guess which the customer meant — and
 * guessing wrong locks a valid account holder out of their own sign-in form.
 * Whether the credential is right is the server's question to answer.
 */
const loginRules = {
  identifier: [required('Enter your phone number or email.')],
  password: [required('Enter your password.')],
}

export function LoginForm({ locale }: { locale: string }) {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({})
  const [submitted, setSubmitted] = useState(false)

  const revalidate = (next: LoginValues) => {
    if (submitted) setErrors(validate(next, loginRules))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const found = validate({ identifier: phone, password }, loginRules)
    setErrors(found)
    if (hasErrors(found)) return

    const ok = await login(phone, password)
    if (ok) router.push(`/${locale}/account`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-line rounded-md p-6 shadow-sm space-y-4"
    >
      <FormField label="Phone Number or Email" required error={errors.identifier}>
        {(props) => (
          <input
            {...props}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              clearError()
              revalidate({ identifier: e.target.value, password })
            }}
            className={inputClass(errors.identifier)}
            placeholder="+92 300 1234567"
            autoComplete="username"
          />
        )}
      </FormField>

      <FormField label="Password" required error={errors.password}>
        {(props) => (
          <div className="relative">
            <input
              {...props}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearError()
                revalidate({ identifier: phone, password: e.target.value })
              }}
              className={inputClass(errors.password, 'pe-10')}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-stone hover:text-ink"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}
      </FormField>

      {error && (
        <p role="alert" className="text-xs text-alert font-medium">
          {error}
        </p>
      )}

      <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 disabled:opacity-70">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {isLoading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Removed here: a "Forgot?" link to /forgot-password, which is not a
          route, and a "Continue with WhatsApp OTP" button with no handler.
          Both looked functional and did nothing — a customer who has actually
          forgotten their password was worse off for the link existing.
          Restore each alongside the flow that implements it. */}
    </form>
  )
}
