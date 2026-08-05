'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  validate,
  hasErrors,
  required,
  minLength,
  maxLength,
  phone as phoneRule,
  email as emailRule,
  password as passwordRule,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'

interface RegisterValues {
  name: string
  phone: string
  email: string
  password: string
}

/** Mirrors the API's RegisterDto so a rejection here is never a surprise. */
const registerRules = {
  name: [required('Enter your full name.'), minLength(2), maxLength(120)],
  phone: [required('A phone number is required.'), phoneRule()],
  email: [emailRule()],
  password: [required('Choose a password.'), passwordRule(8)],
}

export function RegisterForm({ locale }: { locale: string }) {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<RegisterValues>>({})
  const [submitted, setSubmitted] = useState(false)

  const values: RegisterValues = { name, phone, email, password }

  const revalidate = (next: RegisterValues) => {
    if (submitted) setErrors(validate(next, registerRules))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const found = validate(values, registerRules)
    setErrors(found)
    if (hasErrors(found)) return

    const ok = await register(name.trim(), phone, email.trim(), password)
    if (ok) router.push(`/${locale}/account`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-line rounded-md p-6 shadow-sm space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Full Name" required error={errors.name}>
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearError()
                revalidate({ ...values, name: e.target.value })
              }}
              className={inputClass(errors.name)}
              placeholder="Muhammad Ali"
              autoComplete="name"
            />
          )}
        </FormField>

        <FormField
          label="Phone"
          required
          error={errors.phone}
          hint="You’ll sign in with this number."
        >
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                clearError()
                revalidate({ ...values, phone: e.target.value })
              }}
              className={inputClass(errors.phone)}
              placeholder="+92 300 1234567"
              autoComplete="tel"
            />
          )}
        </FormField>
      </div>

      <FormField label="Email (optional)" error={errors.email}>
        {(props) => (
          <input
            {...props}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearError()
              revalidate({ ...values, email: e.target.value })
            }}
            className={inputClass(errors.email)}
            placeholder="ali@example.com"
            autoComplete="email"
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
                revalidate({ ...values, password: e.target.value })
              }}
              className={inputClass(errors.password, 'pe-10')}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
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

      {/* Removed here: a "Register with WhatsApp OTP" button with no handler.
          Restore it alongside the OTP flow that implements it. */}
    </form>
  )
}
