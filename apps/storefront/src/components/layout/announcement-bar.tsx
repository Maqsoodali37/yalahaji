'use client'

import { useTranslations } from 'next-intl'
import { Truck, ShieldCheck, RotateCcw } from 'lucide-react'

const items = [
  { icon: Truck,        key: 'freeShipping' },
  { icon: ShieldCheck,  key: 'cod' },
  { icon: RotateCcw,    key: 'returns' },
] as const

export function AnnouncementBar() {
  const t = useTranslations('announce')
  return (
    <div className="bg-green-dark text-white text-xs font-medium overflow-hidden">
      <div className="flex items-center justify-center gap-6 h-9 animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <item.icon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t(item.key as never) }} />
            {i % items.length < items.length - 1 && (
              <span className="mx-1 opacity-30 text-[10px]">•</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
