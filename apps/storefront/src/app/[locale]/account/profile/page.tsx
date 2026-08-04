'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">Profile Settings</h2>
      <div className="bg-white border border-line rounded-md p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Full Name</label>
            <input className="input-base" defaultValue="Muhammad Ali" />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Phone</label>
            <input className="input-base" defaultValue="+92 300 1234567" type="tel" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Email</label>
          <input className="input-base" defaultValue="guest@yalahaji.com" type="email" />
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-green text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Profile saved successfully!
          </div>
        )}

        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
          className="btn-primary py-2.5 px-6"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
