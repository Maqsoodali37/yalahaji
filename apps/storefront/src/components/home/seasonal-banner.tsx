'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

// Hajj 2026 approximate date
const HAJJ_DATE = new Date('2026-06-10T00:00:00Z')

function useCountdown(target: Date) {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const update = () => {
      const ms = target.getTime() - Date.now()
      if (ms <= 0) return
      setDiff({
        days: Math.floor(ms / (1000 * 60 * 60 * 24)),
        hours: Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((ms % (1000 * 60)) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [target])

  return diff
}

export function SeasonalBanner() {
  const locale = useLocale()
  const { days, hours, minutes, seconds } = useCountdown(HAJJ_DATE)

  return (
    <div className="bg-gradient-to-r from-gold-tint via-white to-gold-tint border-y border-gold/20">
      <div className="container-max py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-sm flex items-center justify-center">
              <Clock className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone uppercase tracking-wider">
                Hajj 1447 AH — June 2026
              </p>
              <p className="font-bold text-ink">
                Prepare early — order your Hajj kit today
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {[
              { label: 'Days', value: days },
              { label: 'Hrs', value: hours },
              { label: 'Min', value: minutes },
              { label: 'Sec', value: seconds },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="w-14 h-14 bg-green text-white rounded-md flex items-center justify-center">
                  <span className="text-xl font-bold tabular-nums">
                    {String(value).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-[10px] text-stone mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/${locale}/shop/kits`}
            className="btn-primary whitespace-nowrap"
          >
            Shop Hajj Kits →
          </Link>
        </div>
      </div>
    </div>
  )
}
