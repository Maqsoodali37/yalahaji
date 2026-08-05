'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  ShoppingCart, Heart, BarChart2, Share2, Gift, ChevronRight,
  Minus, Plus, Star, CheckCircle, AlertCircle, Clock,
  ChevronDown, ChevronUp, MessageCircle
} from 'lucide-react'
import type { Product, ProductVariant, Review } from '@/types'
import { ProductImage } from '@/components/ui/product-image'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import {
  formatPrice, formatDiscount, getTierBadgeClass, getTierTextClass, cn
} from '@/lib/utils'
import { SOCIAL } from '@/lib/seo'
import { ProductCard } from '@/components/shop/product-card'
import { toAnalyticsItem, trackViewItem } from '@/lib/analytics'

interface Props {
  product: Product
  reviews: Review[]
  relatedProducts: Product[]
}

export function ProductDetailClient({ product, reviews, relatedProducts }: Props) {
  const locale = useLocale()

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0])
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [giftWrap, setGiftWrap] = useState(false)
  const [giftMessage, setGiftMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'description' | 'size-guide' | 'kit-contents' | 'shipping'>('description')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifySent, setNotifySent] = useState(false)

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { isInWishlist, toggle: toggleWishlist } = useWishlistStore()
  const inWishlist = isInWishlist(product.id)

  // One view_item per variant the visitor lands on or switches to. Keyed on
  // the variant id rather than the product so tier and size selections show up
  // as separate item views, which is how the cart and purchase events key too.
  useEffect(() => {
    trackViewItem(
      toAnalyticsItem({
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name.en,
        tier: selectedVariant.tier,
        size: selectedVariant.size,
        color: selectedVariant.color,
        scent: selectedVariant.scent,
        price: selectedVariant.price,
        compareAtPrice: selectedVariant.compareAtPrice,
        quantity: 1,
      }),
    )
    // product.name.en is intentionally the label sent to GA4 — reports stay
    // comparable across locales instead of splitting one product into three.
  }, [product.id, product.name.en, selectedVariant])

  const isOutOfStock = selectedVariant.stock === 0
  const isLowStock = !isOutOfStock && selectedVariant.stock <= selectedVariant.lowStockThreshold
  const discount = selectedVariant.compareAtPrice
    ? formatDiscount(selectedVariant.compareAtPrice, selectedVariant.price)
    : 0

  // Group variants by type
  const tiers = [...new Set(product.variants.map((v) => v.tier))]
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))]
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))]
  const scents = [...new Set(product.variants.map((v) => v.scent).filter(Boolean))]

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name.en,
      image: product.images[0]?.url ?? '',
      tier: selectedVariant.tier,
      size: selectedVariant.size,
      color: selectedVariant.color,
      colorHex: selectedVariant.colorHex,
      scent: selectedVariant.scent,
      price: selectedVariant.price,
      compareAtPrice: selectedVariant.compareAtPrice,
      hasGiftWrap: giftWrap,
      giftMessage: giftWrap ? giftMessage : undefined,
    }, quantity)
    setAddedToCart(true)
    setTimeout(() => {
      setAddedToCart(false)
      openCart()
    }, 1200)
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }))

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-green-tint border-b border-line">
        <div className="container-max py-3">
          <nav className="flex items-center gap-1.5 text-sm text-stone flex-wrap">
            <Link href={`/${locale}`} className="hover:text-green">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${locale}/shop`} className="hover:text-green">Shop</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${locale}/shop/${product.categorySlug}`} className="hover:text-green capitalize">
              {product.categorySlug.replace(/-/g, ' ')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-ink font-medium truncate max-w-[200px]">{product.name.en}</span>
          </nav>
        </div>
      </div>

      <div className="container-max py-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* ── Gallery ────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="aspect-square bg-green-tint rounded-lg overflow-hidden relative flex items-center justify-center text-8xl">
              <ProductImage
                src={product.images[activeImage]?.url}
                alt={product.images[activeImage]?.alt ?? product.name.en}
                className="absolute inset-0"
              />
              {/* Badges */}
              <div className="absolute top-4 start-4 flex flex-col gap-1.5">
                {product.badges.map((badge) => (
                  <span
                    key={badge}
                    className={cn(
                      'text-xs font-bold px-2 py-1 rounded-sm uppercase',
                      badge === 'new' && 'bg-green text-white',
                      badge === 'hot' && 'bg-gold text-ink',
                      badge === 'sale' && 'bg-alert text-white',
                      badge === 'bestseller' && 'bg-green-tint text-green border border-green/20',
                    )}
                  >
                    {badge}
                  </span>
                ))}
                {discount > 0 && (
                  <span className="bg-alert text-white text-xs font-bold px-2 py-1 rounded-sm">
                    -{discount}%
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-colors',
                      i === activeImage ? 'border-green' : 'border-transparent hover:border-line'
                    )}
                  >
                    <ProductImage src={img.url} alt={img.alt} fallback="🕋" />
                  </button>
                ))}
              </div>
            )}

            {/* SKU */}
            <p className="text-xs text-stone">SKU: {selectedVariant.sku}</p>
          </div>

          {/* ── Product Info ────────────────────────────────────── */}
          <div>
            {/* Category */}
            <Link
              href={`/${locale}/shop/${product.categorySlug}`}
              className="text-xs font-semibold text-green uppercase tracking-widest hover:text-gold transition-colors"
            >
              {product.categorySlug.replace(/-/g, ' ')}
            </Link>

            {/* Name */}
            <h1 className="serif text-3xl md:text-4xl text-ink mt-2 leading-tight">
              {product.name.en}
            </h1>

            {/* Rating row */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.round(product.avgRating)
                        ? 'fill-gold text-gold'
                        : 'text-stone/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-ink">{product.avgRating}</span>
              <a
                href="#reviews"
                className="text-sm text-stone hover:text-green transition-colors"
              >
                ({product.reviewCount} reviews)
              </a>
              <span className="text-stone/40">·</span>
              <span className="text-sm text-stone">{product.soldCount.toLocaleString()} sold</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold text-ink">
                {formatPrice(selectedVariant.price)}
              </span>
              {selectedVariant.compareAtPrice && (
                <>
                  <span className="text-lg text-stone line-through">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                  <span className="bg-alert text-white text-sm font-bold px-2 py-0.5 rounded-sm">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-stone mt-1">{product.shortDescription.en}</p>

            {/* Divider */}
            <div className="border-t border-line my-5" />

            {/* ── Variant Selectors ─────────────────────────── */}
            {/* Tier selector */}
            {tiers.length > 1 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-2 block">
                  Tier
                </label>
                <div className="flex gap-2">
                  {tiers.map((tier) => {
                    const tierVariant = product.variants.find(
                      (v) =>
                        v.tier === tier &&
                        (!selectedVariant.size || v.size === selectedVariant.size)
                    )
                    return (
                      <button
                        key={tier}
                        onClick={() => tierVariant && setSelectedVariant(tierVariant)}
                        disabled={!tierVariant}
                        className={cn(
                          'px-4 py-2 rounded-sm border text-sm font-semibold transition-all',
                          selectedVariant.tier === tier
                            ? tier === 'Economy'
                              ? 'bg-stone text-white border-stone'
                              : tier === 'Standard'
                              ? 'bg-green text-white border-green'
                              : 'bg-gold text-ink border-gold'
                            : 'border-line text-stone hover:border-green hover:text-green',
                          !tierVariant && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        {tier}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone uppercase tracking-wider">
                    Size
                  </label>
                  {product.sizeGuide && (
                    <button
                      onClick={() => setActiveTab('size-guide')}
                      className="text-xs text-green font-medium hover:underline"
                    >
                      Size Guide →
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const sizeVariant = product.variants.find(
                      (v) => v.size === size && v.tier === selectedVariant.tier
                    )
                    const available = sizeVariant && sizeVariant.stock > 0
                    return (
                      <button
                        key={size}
                        onClick={() => sizeVariant && setSelectedVariant(sizeVariant)}
                        disabled={!available}
                        className={cn(
                          'min-w-[3rem] px-3 py-2 rounded-sm border text-sm font-medium transition-all',
                          selectedVariant.size === size
                            ? 'bg-green text-white border-green'
                            : 'border-line text-stone hover:border-green hover:text-green',
                          !available && 'opacity-40 cursor-not-allowed line-through'
                        )}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-2 block">
                  Color: <span className="text-ink normal-case font-normal ms-1">{selectedVariant.color}</span>
                </label>
                <div className="flex gap-2">
                  {colors.map((color) => {
                    const colorVariant = product.variants.find(
                      (v) => v.color === color && v.tier === selectedVariant.tier
                    )
                    return (
                      <button
                        key={color}
                        title={color}
                        onClick={() => colorVariant && setSelectedVariant(colorVariant)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          selectedVariant.color === color
                            ? 'border-green ring-2 ring-green ring-offset-2'
                            : 'border-white ring-1 ring-line hover:ring-green'
                        )}
                        style={{ backgroundColor: colorVariant?.colorHex ?? '#ccc' }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Scent selector */}
            {scents.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-2 block">
                  Scent
                </label>
                <div className="flex flex-wrap gap-2">
                  {scents.map((scent) => {
                    const scentVariant = product.variants.find(
                      (v) => v.scent === scent && v.tier === selectedVariant.tier
                    )
                    return (
                      <button
                        key={scent}
                        onClick={() => scentVariant && setSelectedVariant(scentVariant)}
                        className={cn(
                          'px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                          selectedVariant.scent === scent
                            ? 'bg-gold text-ink border-gold'
                            : 'border-line text-stone hover:border-gold hover:text-gold-deep'
                        )}
                      >
                        🌹 {scent}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div className="mb-4">
              {isOutOfStock ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-alert">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Out of Stock</span>
                  </div>
                  {/* Notify me form */}
                  {notifySent ? (
                    <div className="flex items-center gap-2 text-green text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      We'll notify you when it's back in stock!
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="Your email address"
                        className="flex-1 text-sm px-3 py-2 border border-line rounded-sm focus:outline-none focus:border-green bg-white text-ink placeholder:text-stone"
                      />
                      <button
                        onClick={() => { if (notifyEmail.includes('@')) setNotifySent(true) }}
                        className="btn-outline text-xs px-3 py-2 whitespace-nowrap"
                      >
                        Notify Me
                      </button>
                    </div>
                  )}
                </div>
              ) : isLowStock ? (
                <div className="flex items-center gap-2 text-gold-deep">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Only {selectedVariant.stock} left — order soon!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">In Stock</span>
                </div>
              )}
            </div>

            {/* Quantity + CTA */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center border border-line rounded-sm overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-12 flex items-center justify-center text-stone hover:bg-green-tint hover:text-green transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-ink">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-12 flex items-center justify-center text-stone hover:bg-green-tint hover:text-green transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={cn(
                  'flex-1 btn-primary py-3 text-base justify-center transition-all',
                  addedToCart && 'bg-green-mid scale-95'
                )}
              >
                <ShoppingCart className="w-5 h-5" />
                {addedToCart ? '✓ Added!' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={cn(
                  'w-12 h-12 flex items-center justify-center rounded-sm border transition-colors',
                  inWishlist
                    ? 'bg-alert border-alert text-white'
                    : 'border-line text-stone hover:border-alert hover:text-alert'
                )}
              >
                <Heart className={cn('w-5 h-5', inWishlist && 'fill-current')} />
              </button>
            </div>

            {/* Gift wrap */}
            {product.hasGiftWrap && (
              <div className="mb-4 p-3 bg-gold-tint border border-gold/20 rounded-sm">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="w-4 h-4 rounded text-gold border-gold focus:ring-gold"
                  />
                  <Gift className="w-4 h-4 text-gold-deep" />
                  <span className="text-sm font-semibold text-ink">Add Gift Wrap (+₨99)</span>
                </label>
                {giftWrap && (
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Write a personal message (optional)..."
                    rows={2}
                    className="mt-2 w-full text-xs p-2 border border-gold/20 rounded-sm bg-white text-ink placeholder:text-stone focus:outline-none focus:border-gold resize-none"
                  />
                )}
              </div>
            )}

            {/* Share + Compare */}
            <div className="flex gap-3 text-sm text-stone">
              <button className="flex items-center gap-1.5 hover:text-green transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <a
                href={`${SOCIAL.whatsapp}?text=I'm%20interested%20in%20${encodeURIComponent(product.name.en)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#25D366] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <button className="flex items-center gap-1.5 hover:text-green transition-colors">
                <BarChart2 className="w-4 h-4" />
                Compare
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-line">
              {[
                { icon: '🚚', label: 'Free Shipping', sub: 'Over ₨2,999' },
                { icon: '↩️', label: '7-Day Returns', sub: 'Hassle-free' },
                { icon: '🔒', label: 'Secure Payment', sub: 'JazzCash · COD' },
              ].map((badge) => (
                <div key={badge.label} className="text-center">
                  <span className="text-xl">{badge.icon}</span>
                  <p className="text-xs font-semibold text-ink mt-1">{badge.label}</p>
                  <p className="text-[11px] text-stone">{badge.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="mt-12 border border-line rounded-lg overflow-hidden">
          <div className="flex border-b border-line overflow-x-auto no-scrollbar">
            {[
              { key: 'description', label: 'Description' },
              ...(product.sizeGuide ? [{ key: 'size-guide', label: 'Size Guide' }] : []),
              ...(product.isKit ? [{ key: 'kit-contents', label: 'Kit Contents' }] : []),
              { key: 'shipping', label: 'Shipping & Returns' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  'flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-green text-green'
                    : 'border-transparent text-stone hover:text-green'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose prose-sm max-w-none text-ink-2">
                <p>{product.description.en}</p>
              </div>
            )}
            {activeTab === 'size-guide' && product.sizeGuide && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-line">
                      {Object.keys(product.sizeGuide[0]).map((key) => (
                        <th key={key} className="pb-2 pe-4 font-semibold text-ink capitalize">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizeGuide.map((row, i) => (
                      <tr key={i} className={cn('border-b border-line', i % 2 === 0 && 'bg-paper')}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-2 pe-4 text-stone">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'kit-contents' && product.kitContents && (
              <div className="grid sm:grid-cols-2 gap-3">
                {product.kitContents.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-green-tint rounded-sm">
                    <div className="w-12 h-12 bg-white rounded-sm flex items-center justify-center text-2xl flex-shrink-0">
                      📦
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.productName.en}</p>
                      <p className="text-xs text-stone">Qty: {item.quantity} · {item.tier}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'shipping' && (
              <div className="space-y-4 text-sm text-ink-2">
                <div>
                  <h4 className="font-semibold text-ink mb-1">Shipping</h4>
                  <p>Free shipping on all orders over ₨2,999. Standard delivery takes 3–5 business days. Express delivery (1–2 days) available for ₨299.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-ink mb-1">Returns</h4>
                  <p>7-day hassle-free returns. Item must be unused, in original packaging. Contact our support team via WhatsApp to initiate a return.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-ink mb-1">Cash on Delivery</h4>
                  <p>Pay when your order arrives. You can inspect the package before paying. Available across Pakistan.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Reviews ───────────────────────────────────────────── */}
        <div id="reviews" className="mt-12">
          <div className="flex items-end justify-between mb-6">
            <h2 className="serif text-2xl text-ink">Customer Reviews</h2>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-5 h-5',
                    i < Math.round(product.avgRating) ? 'fill-gold text-gold' : 'text-stone/20'
                  )}
                />
              ))}
              <span className="font-bold text-ink">{product.avgRating}</span>
              <span className="text-stone text-sm">/ 5</span>
            </div>
          </div>

          {/* Rating breakdown */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8 p-5 bg-paper rounded-md border border-line">
            <div className="space-y-2">
              {ratingCounts.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="text-gold font-medium w-3">{rating}</span>
                  <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                  <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-stone w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-6xl font-bold text-ink">{product.avgRating}</p>
              <div className="flex gap-0.5 my-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5',
                      i < Math.round(product.avgRating) ? 'fill-gold text-gold' : 'text-stone/20'
                    )}
                  />
                ))}
              </div>
              <p className="text-stone text-sm">{product.reviewCount} reviews</p>
            </div>
          </div>

          {/* Review list */}
          <div className="space-y-5">
            {displayedReviews.map((review) => (
              <div key={review.id} className="border border-line rounded-md p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-tint rounded-full flex items-center justify-center text-green font-bold text-sm">
                      {review.author[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">{review.author}</p>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3.5 h-3.5',
                              i < review.rating ? 'fill-gold text-gold' : 'text-stone/20'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone">
                      {new Date(review.createdAt).toLocaleDateString('en-PK')}
                    </p>
                    {review.verified && (
                      <span className="text-[10px] text-green font-semibold flex items-center gap-1 justify-end mt-0.5">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-semibold text-ink mt-3 mb-1">{review.title}</h4>
                <p className="text-sm text-stone leading-relaxed">{review.body}</p>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, i) => (
                      <div key={i} className="w-16 h-16 bg-green-tint rounded-sm" />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-stone">
                  <button className="hover:text-green transition-colors">
                    👍 Helpful ({review.helpful})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="mt-4 btn-outline w-full justify-center"
            >
              {showAllReviews ? (
                <><ChevronUp className="w-4 h-4" /> Show Less</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Show All {reviews.length} Reviews</>
              )}
            </button>
          )}
        </div>

        {/* ── Related Products ───────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <h2 className="serif text-2xl text-ink mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
