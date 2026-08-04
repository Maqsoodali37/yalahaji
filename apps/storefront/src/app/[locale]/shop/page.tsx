import { ShopPage } from '@/components/shop/shop-page'
import { products } from '@/data/products'
import { categories } from '@/data/categories'

export default function Shop() {
  return <ShopPage products={products} categories={categories} />
}
