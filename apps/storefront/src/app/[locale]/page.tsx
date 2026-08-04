import { HeroCarousel } from '@/components/home/hero-carousel'
import { UspStrip } from '@/components/home/usp-strip'
import { CategoryTiles } from '@/components/home/category-tiles'
import { FeaturedProducts } from '@/components/home/featured-products'
import { PromoSplit } from '@/components/home/promo-split'
import { CommitmentSection } from '@/components/home/commitment-section'
import { GuidesTips } from '@/components/home/guides-tips'

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <UspStrip />
      <CategoryTiles />
      <FeaturedProducts />
      <PromoSplit />
      <CommitmentSection />
      <GuidesTips />
    </>
  )
}
