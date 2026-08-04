'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ur', label: 'اردو', name: 'Urdu' },
  { code: 'ar', label: 'عربي', name: 'Arabic' },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const switchLocale = (newLocale: string) => {
    // Replace current locale prefix in pathname
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost p-2 flex items-center gap-1 text-xs font-semibold"
        aria-label="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute end-0 top-full z-50 mt-1 bg-white border border-line rounded-md shadow-md overflow-hidden w-36">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-green-tint transition-colors',
                  locale === l.code && 'bg-green-tint text-green font-semibold'
                )}
              >
                <span className="font-semibold w-8">{l.label}</span>
                <span className="text-stone text-xs">{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
