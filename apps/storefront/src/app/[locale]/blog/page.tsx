import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import { fetchBlogPosts, fetchBlogCategories } from '@/lib/api'
import { SafeImage } from '@/components/ui/safe-image'
import type { BlogCategory } from '@/types'

const PAGE_SIZE = 12

/** Cover art per category, with a general fallback for ones without their own. */
const COVER_BY_CATEGORY: Partial<Record<BlogCategory, string>> = {
  'product-guides': '/assets/fragrances.png',
  dua: '/assets/tabaruk.png',
}
const DEFAULT_COVER = '/assets/umrah-kit.png'

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const locale = await getLocale()
  const { category, page } = await searchParams

  // A junk `?page=abc` should show page one, not crash on NaN.
  const parsedPage = Number.parseInt(page ?? '1', 10)
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  // Both reads go through apiFetchSafe, so an unreachable API renders an empty
  // blog rather than a 500 on a page customers reach from the main nav.
  const [categories, { items: posts, total, totalPages }] = await Promise.all([
    fetchBlogCategories(),
    fetchBlogPosts(currentPage, PAGE_SIZE, category as BlogCategory | undefined),
  ])

  // An unknown ?category= is treated as "all" rather than showing an active
  // chip that matches nothing.
  const activeCategory = categories.some((c) => c.slug === category) ? category : undefined

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/${locale}/blog${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="bg-paper min-h-screen">
      {/* Page header — light paper, matches approved theme */}
      <div className="border-b border-line bg-white py-10">
        <div className="container-max">
          <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
            Guides &amp; Tips
          </span>
          <h1 className="serif text-3xl md:text-4xl text-ink mb-1">Hajj &amp; Umrah Guides</h1>
          <p className="text-ink-2 text-sm">
            Expert advice, packing lists, and spiritual preparation
          </p>
        </div>
      </div>

      <div className="container-max py-8">
        {/* Category filter — derived from the API, so a category added in the
            admin panel gets a chip without a storefront deploy. */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-8">
            <Link
              href={`/${locale}/blog`}
              className={`px-4 py-2 rounded-sm border text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                !activeCategory
                  ? 'bg-green text-white border-green'
                  : 'bg-white border-line text-stone hover:border-green/40'
              }`}
            >
              All Posts
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${locale}/blog?category=${cat.slug}`}
                className={`px-4 py-2 rounded-sm border text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeCategory === cat.slug
                    ? 'bg-green text-white border-green'
                    : 'bg-white border-line text-stone hover:border-green/40'
                }`}
              >
                {cat.label}
                <span className="ms-1.5 text-xs opacity-70">{cat.count}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Posts grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="bg-white border border-line rounded-md overflow-hidden hover:border-green/40 hover:shadow-sm transition-all group"
            >
              <div className="aspect-video bg-paper border-b border-line flex items-center justify-center overflow-hidden">
                <SafeImage
                  src={post.coverImage || COVER_BY_CATEGORY[post.category] || DEFAULT_COVER}
                  alt={post.title.en}
                  loading="lazy"
                  className="w-full h-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-green uppercase tracking-wider bg-green-tint px-2 py-0.5 rounded-sm">
                    {categories.find((c) => c.slug === post.category)?.label ?? post.category}
                  </span>
                  {post.featured && (
                    <span className="text-[10px] font-bold text-gold-deep uppercase bg-gold/10 px-2 py-0.5 rounded-sm">
                      Featured
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-ink group-hover:text-green transition-colors leading-snug mb-2">
                  {post.title.en}
                </h2>
                <p className="text-sm text-stone line-clamp-2 mb-4">{post.excerpt.en}</p>
                <div className="flex items-center gap-3 text-xs text-stone">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readingTime} min read
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 text-stone">
            <p className="font-semibold text-ink mb-1">
              {activeCategory ? 'No posts in this category yet.' : 'No posts published yet.'}
            </p>
            {activeCategory && (
              <Link href={`/${locale}/blog`} className="text-green text-sm hover:underline">
                View all posts
              </Link>
            )}
          </div>
        )}

        {/* Server-rendered pagination. The page previously fetched 50 posts and
            filtered them in the browser, so anything past that window was
            unreachable. */}
        {totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="flex items-center justify-center gap-2 mt-10"
          >
            {currentPage > 1 && (
              <Link href={pageHref(currentPage - 1)} className="btn-outline text-sm py-2 px-3">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Link>
            )}
            <span className="text-sm text-stone px-3">
              Page {currentPage} of {totalPages} · {total} posts
            </span>
            {currentPage < totalPages && (
              <Link href={pageHref(currentPage + 1)} className="btn-outline text-sm py-2 px-3">
                Next
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
