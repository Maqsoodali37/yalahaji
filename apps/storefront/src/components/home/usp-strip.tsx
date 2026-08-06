'use client'

import { Truck, RotateCcw, ShieldCheck, MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFreeShippingThreshold } from '@/lib/use-shop-settings'

// 4 USPs — matches approved design (grid-template-columns:repeat(4,1fr))
const items = [
  { icon: Truck, titleKey: 'freeShipping', detailKey: 'freeShippingDetail' },
  { icon: RotateCcw, titleKey: 'easyReturns', detailKey: 'easyReturnsDetail' },
  { icon: ShieldCheck, titleKey: 'halal', detailKey: 'halalDetail' },
  { icon: MessageCircle, titleKey: 'whatsapp', detailKey: 'whatsappDetail' },
] as const

export function UspStrip() {
  const t = useTranslations('usp')
  // `freeShippingDetail` is the only message here that takes a value. Passing
  // `amount` to all four is harmless — next-intl ignores unused arguments —
  // and keeps this a single `t()` call inside the map.
  const { formatted } = useFreeShippingThreshold()
  return (
    <div className="container-max mt-6">
      {/* 1px gap on line-color background = separator lines between cells */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-md overflow-hidden border border-line"
        style={{ gap: '1px', background: '#DFE7E2' }}
      >
        {items.map((item) => (
          <div
            key={item.titleKey}
            className="bg-white flex items-center gap-3.5 px-5 py-[22px]"
          >
            {/* Gold-tint circular icon — matches approved design */}
            <div className="w-10 h-10 rounded-full bg-gold-tint text-gold-deep flex items-center justify-center flex-shrink-0">
              <item.icon className="w-[18px] h-[18px]" />
            </div>
            <div>
              <strong className="block text-[13.5px] font-bold text-ink leading-tight">
                {t(item.titleKey)}
              </strong>
              <small className="text-[11.5px] text-stone">
                {t(item.detailKey, { amount: formatted })}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
