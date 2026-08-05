'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useProduct, useUpdateProduct } from '@/hooks/use-products'
import { RequireRole } from '@/components/layout/auth-gate'
import { ProductForm } from '@/components/products/product-form'
import { PageHeader, Badge, ErrorState, Skeleton } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import type { ProductInput } from '@/types'

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000'

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <RequireRole>
      <EditProduct id={id} />
    </RequireRole>
  )
}

function EditProduct({ id }: { id: string }) {
  const { toast } = useToast()
  const { data: product, isLoading, isError, error, refetch } = useProduct(id)
  const update = useUpdateProduct(id)

  async function handleSubmit(values: ProductInput & { isActive?: boolean }) {
    try {
      await update.mutateAsync(values)
      toast('Product saved.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save product.', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Product not found.'}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <>
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-green mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to products
      </Link>

      <PageHeader
        title={product.nameEn}
        description={`Last updated ${formatDateTime(product.updatedAt)}`}
        action={
          <div className="flex items-center gap-3">
            <Badge
              className={
                product.isActive ? 'bg-green-light text-[#137A4C]' : 'bg-paper text-ink-3'
              }
            >
              {product.isActive ? 'Active' : 'Archived'}
            </Badge>
            <a
              href={`${STOREFRONT_URL}/en/products/${product.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                View on storefront
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        }
      />

      <ProductForm product={product} onSubmit={handleSubmit} submitting={update.isPending} />
    </>
  )
}
