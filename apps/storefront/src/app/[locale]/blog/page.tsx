import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Clock, ChevronRight } from 'lucide-react'
import { blogPosts, blogCategories } from '@/data/blog'
import { SafeImage } from '@/components/ui/safe-image'

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const locale = await getLocale()
  const { category } = await searchParams
  const activeCategory = category ?? 'all'

  const filtered =
    activeCategory === 'all'
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory)

  return (
    <div className="bg-paper min-h-screen">
      {/* Page header — light paper, matches approved theme */}
      <div className="border-b border-line bg-white py-10">
        <div className="container-max">
          <span className="block text-[11px] font-extrabold tracking-[.14em] uppercase text-gold-deep mb-2">
            Guides & Tips
          </span>
          <h1 className="serif text-3xl md:text-4xl text-ink mb-1">Hajj & Umrah Guides</h1>
          <p className="text-ink-2 text-sm">Expert advice, packing lists, and spiritual preparation</p>
        </div>
      </div>

      <div className="container-max py-8">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-8">
          <Link
            href={`/${locale}/blog`}
            className={`px-4 py-2 rounded-sm border text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeCategory === 'all'
                ? 'bg-green text-white border-green'
                : 'bg-white border-line text-stone hover:border-green/40'
            }`}
          >
            All Posts
          </Link>
          {blogCategories.map((cat) => (
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
            </Link>
          ))}
        </div>

        {/* Posts grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="bg-white border border-line rounded-md overflow-hidden hover:border-green/40 hover:shadow-sm transition-all group"
            >
              <div className="aspect-video bg-paper border-b border-line flex items-center justify-center overflow-hidden">
                <SafeImage
                  src={
                    post.category === 'product-guides'
                      ? '/assets/fragrances.png'
                      : post.category === 'dua'
                        ? '/assets/tabaruk.png'
                        : '/assets/umrah-kit.png'
                  }
                  alt={post.title.en}
                  loading="lazy"
                  className="w-full h-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-green uppercase tracking-wider bg-green-tint px-2 py-0.5 rounded-sm">
                    {post.category}
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
                  <span>{new Date(post.publishedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-stone">
            <p>No posts in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
