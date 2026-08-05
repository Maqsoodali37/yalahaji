'use client'

import { useRouter } from 'next/navigation'
import { useCreateProduct } from '@/hooks/use-products'
import { RequireRole } from '@/components/layout/auth-gate'
import { ProductForm } from '@/components/products/product-form'
import { PageHeader } from '@/components/ui/panel'
import { useToast } from '@/components/ui/toast'
import type { ProductInput } from '@/types'

export default function NewProductPage() {
  return (
    <RequireRole>
      <NewProduct />
    </RequireRole>
  )
}

function NewProduct() {
  const router = useRouter()
  const { toast } = useToast()
  const create = useCreateProduct()

  async function handleSubmit(values: ProductInput) {
    try {
      const product = await create.mutateAsync(values)
      toast(`"${product.nameEn}" created.`)
      router.push(`/products/${product.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create product.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="New product"
        description="Add a product to the catalogue. It goes live as soon as it's saved."
      />
      <ProductForm onSubmit={handleSubmit} submitting={create.isPending} />
    </>
  )
}
