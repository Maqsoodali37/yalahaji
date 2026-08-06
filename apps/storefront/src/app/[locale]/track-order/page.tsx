import type { Metadata } from 'next'
import { TrackOrderClient } from '@/components/orders/track-order-client'

export const metadata: Metadata = {
  title: 'Track Your Order',
  description:
    'Follow your Yala Haji delivery with your order number — no account needed.',
  // The page is useful to customers but has nothing for a search index: every
  // view is a lookup against a number only the buyer holds.
  robots: { index: false, follow: true },
}

export default function TrackOrderPage() {
  return (
    <div className="bg-paper min-h-screen">
      <TrackOrderClient />
    </div>
  )
}
