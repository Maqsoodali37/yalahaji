'use client'

import { Users } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function CustomersPage() {
  return (
    <ComingSoon
      title="Customers"
      description="Profiles, order history and segmentation."
      icon={Users}
      planned={[
        'Customer list with search, order count and lifetime value',
        'Per-customer order history and addresses',
        'Segmentation: VIP, repeat, at-risk',
        'Activate / deactivate accounts',
      ]}
      endpoints={['GET /users', 'PATCH /users/:id/toggle-active']}
    />
  )
}
