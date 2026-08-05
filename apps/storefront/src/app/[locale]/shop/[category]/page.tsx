import { notFound } from 'next/navigation'
import { ShopPage } from '@/components/shop/shop-page'
import { fetchProducts, fetchCategories, fetchCategoryBySlug } from '@/lib/api'

interface Props {
  params: Promise<{ locale: string; category: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params

  // The category lookup gates the 404, but the product and category-list
  // fetches don't depend on its result — so all three go out together and an
  // unknown slug simply yields an empty product list we never render.
  const [category, page, categories] = await Promise.all([
    fetchCategoryBySlug(categorySlug),
    fetchProducts({ category: categorySlug, limit: 100 }),
    fetchCategories(),
  ])

  if (!category) notFound()

  return <ShopPage products={page.items} categories={categories} activeCategory={categorySlug} />
}
