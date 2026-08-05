'use client'

import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { updateProfile, ApiError } from '@/lib/api'
import {
  validate,
  hasErrors,
  required,
  minLength,
  maxLength,
  email as emailRule,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'

interface ProfileValues {
  name: string
  email: string
}

const profileRules = {
  name: [required('Your name is required.'), minLength(2), maxLength(120)],
  email: [emailRule()],
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<FieldErrors<ProfileValues>>({})
  const [submitted, setSubmitted] = useState(false)

  const revalidate = (next: ProfileValues) => {
    if (submitted) setErrors(validate(next, profileRules))
  }

  // The store hydrates asynchronously, so the fields start empty and fill in
  // once the real user arrives. `defaultValue` would leave them stuck on
  // whatever happened to be there at first render.
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email ?? '')
  }, [user])

  const handleSave = async () => {
    setSubmitted(true)
    const found = validate({ name, email }, profileRules)
    setErrors(found)
    if (hasErrors(found)) return

    setSaving(true)
    setError('')
    try {
      const updated = await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">Profile Settings</h2>
      <div className="bg-white border border-line rounded-md p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Full Name" required error={errors.name}>
            {(props) => (
              <input
                {...props}
                className={inputClass(errors.name)}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  revalidate({ name: e.target.value, email })
                }}
                autoComplete="name"
              />
            )}
          </FormField>

          <FormField
            label="Phone"
            hint="Your phone number is how you sign in and can’t be changed here."
          >
            {(props) => (
              /* Read-only: the phone number is the account identifier and what
                 a customer signs in with, so changing it here would need a
                 verification flow the API doesn't offer yet. */
              <input
                {...props}
                className="input-base bg-paper text-stone cursor-not-allowed"
                value={user?.phone ?? ''}
                type="tel"
                readOnly
                disabled
              />
            )}
          </FormField>
        </div>

        <FormField label="Email" error={errors.email}>
          {(props) => (
            <input
              {...props}
              className={inputClass(errors.email)}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                revalidate({ name, email: e.target.value })
              }}
              type="email"
              autoComplete="email"
            />
          )}
        </FormField>

        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-green text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Profile saved successfully!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !user}
          className="btn-primary py-2.5 px-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
