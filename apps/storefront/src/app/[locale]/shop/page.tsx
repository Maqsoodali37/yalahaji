import { ShopPage } from '@/components/shop/shop-page'
import { fetchProducts, fetchCategories } from '@/lib/api'

// ShopPage filters and sorts client-side over the full list it is handed, so
// this page's job is just to supply real data in place of the mock arrays.
// Fetched in parallel — neither depends on the other.
export default async function Shop() {
  const [page, categories] = await Promise.all([
    fetchProducts({ limit: 100 }),
    fetchCategories(),
  ])

  return <ShopPage products={page.items} categories={categories} />
}
