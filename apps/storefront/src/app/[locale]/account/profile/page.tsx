'use client'

import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { updateProfile, ApiError } from '@/lib/api'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // The store hydrates asynchronously, so the fields start empty and fill in
  // once the real user arrives. `defaultValue` would leave them stuck on
  // whatever happened to be there at first render.
  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email ?? '')
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateProfile({ name, email: email || undefined })
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
          <div>
            <label
              htmlFor="profile-name"
              className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block"
            >
              Full Name
            </label>
            <input
              id="profile-name"
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="profile-phone"
              className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block"
            >
              Phone
            </label>
            {/* Read-only: the phone number is the account identifier and what a
                customer signs in with, so changing it here would need a
                verification flow the API doesn't offer yet. */}
            <input
              id="profile-phone"
              className="input-base bg-paper text-stone cursor-not-allowed"
              value={user?.phone ?? ''}
              type="tel"
              readOnly
              disabled
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="profile-email"
            className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block"
          >
            Email
          </label>
          <input
            id="profile-email"
            className="input-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

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
