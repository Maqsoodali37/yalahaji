'use client'

import { FileText } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function BlogPage() {
  return (
    <ComingSoon
      title="Blog"
      description="Write and publish content for the storefront."
      icon={FileText}
      planned={[
        'Post list with draft / published status',
        'Rich text editor with multilingual bodies',
        'Cover image upload and tags',
        'Schedule publication',
      ]}
      endpoints={['GET /blog/admin', 'POST /blog', 'PATCH /blog/:id', 'DELETE /blog/:id']}
    />
  )
}
