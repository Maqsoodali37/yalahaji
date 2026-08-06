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
    <div className="bg-green-dark text-white text-[11px] sm:text-xs font-medium">
      <div className="container-max flex items-center justify-center gap-3 sm:gap-6 min-h-9 py-2 flex-wrap text-center">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <item.icon className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            {/*
              t.rich, not t(). next-intl parses <b> in a message as a rich-text
              tag and throws FORMATTING_ERROR unless a handler for it is passed
              — plain t() cannot render one. Messages without any tag pass
              through t.rich unchanged, so all three keys use the same call.

              This also drops a dangerouslySetInnerHTML that was injecting
              translation strings straight into the DOM.
            */}
            <span>{t.rich(item.key, { b: (chunks) => <b>{chunks}</b> })}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
