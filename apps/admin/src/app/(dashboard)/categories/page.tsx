'use client'

import { FolderTree } from 'lucide-react'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function CategoriesPage() {
  return (
    <ComingSoon
      title="Categories"
      description="Manage the catalogue taxonomy."
      icon={FolderTree}
      planned={[
        'Tree view with drag-to-reorder',
        'Create, rename and nest categories',
        'Multilingual names (English / Urdu / Arabic)',
        'Per-category SEO fields',
      ]}
      endpoints={[
        'GET /categories',
        'POST /categories',
        'PATCH /categories/:id',
        'DELETE /categories/:id',
      ]}
    />
  )
}
