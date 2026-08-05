'use client'

import { Star } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function ReviewsPage() {
  return (
    <ComingSoon
      title="Reviews"
      description="Moderation queue for customer reviews."
      icon={Star}
      planned={[
        'Pending review queue with approve / reject',
        'Filter by product and rating',
        'Bulk approve',
        'Flag and remove abusive content',
      ]}
      endpoints={[
        'GET /reviews/product/:productId',
        'PATCH /reviews/:id/approve',
        'DELETE /reviews/:id',
      ]}
    />
  )
}
