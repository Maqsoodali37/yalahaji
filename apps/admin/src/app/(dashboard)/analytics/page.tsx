'use client'

import { BarChart3 } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Sales, inventory and customer reporting."
      icon={BarChart3}
      planned={[
        'Revenue and order trends over a selectable date range',
        'Best and worst sellers by category',
        'Customer lifetime value and repeat rate',
        'Coupon performance and CSV export',
      ]}
      endpoints={['GET /orders/admin/stats', 'GET /products/admin/stats']}
    />
  )
}
