import { notFound } from 'next/navigation'
import { ShopPage } from '@/components/shop/shop-page'
import { getProductsByCategory } from '@/data/products'
import { getCategoryBySlug, categories } from '@/data/categories'

interface Props {
  params: Promise<{ locale: string; category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params
  const category = getCategoryBySlug(categorySlug)
  if (!category) notFound()

  const products = getProductsByCategory(categorySlug)

  return <ShopPage products={products} categories={categories} activeCategory={categorySlug} />
}
