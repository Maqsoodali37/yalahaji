'use client'

import { Ticket } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function CouponsPage() {
  return (
    <ComingSoon
      title="Coupons"
      description="Create, schedule and expire promotions."
      icon={Ticket}
      planned={[
        'Coupon list with usage counts and status',
        'Create percentage, fixed and free-shipping discounts',
        'Schedule start/end dates and usage limits',
        'Minimum spend and per-customer restrictions',
      ]}
      endpoints={[
        'GET /coupons',
        'POST /coupons',
        'PATCH /coupons/:id',
        'DELETE /coupons/:id',
      ]}
    />
  )
}
