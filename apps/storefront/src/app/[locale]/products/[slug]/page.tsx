import { notFound } from 'next/navigation'
import { getProductBySlug, getRelatedProducts } from '@/data/products'
import { getReviewsByProduct } from '@/data/reviews'
import { ProductDetailClient } from '@/components/product/product-detail-client'

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) notFound()

  const reviews = getReviewsByProduct(product.id)
  const related = getRelatedProducts(product)

  return (
    <ProductDetailClient
      product={product}
      reviews={reviews}
      relatedProducts={related}
    />
  )
}
