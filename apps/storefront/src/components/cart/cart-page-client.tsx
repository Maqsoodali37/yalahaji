'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ShoppingBag, Trash2, Plus, Minus, Gift, Tag, ArrowRight, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '@/store/cart'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/utils'
import { ProductCard } from '@/components/shop/product-card'
import { getFeaturedProducts } from '@/data/products'
import { ProductImage } from '@/components/ui/product-image'

export function CartPageClient() {
  const locale = useLocale()
  const t = useTranslations('cart')
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState(false)

  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const shipping = useCartStore((s) => s.shipping())
  const total = useCartStore((s) => s.total())
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const couponCode = useCartStore((s) => s.couponCode)
  const freeShippingProgress = useCartStore((s) => s.freeShippingProgress())
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const applyCoupon = useCartStore((s) => s.applyCoupon)
  const removeCoupon = useCartStore((s) => s.removeCoupon)

  const amountUntilFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const suggestedProducts = getFeaturedProducts().slice(0, 4)

  const handleApplyCoupon = () => {
    const success = applyCoupon(couponInput)
    if (success) {
      setCouponSuccess(true)
      setCouponError('')
    } else {
      setCouponError(t('couponInvalid'))
      setCouponSuccess(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-max py-16 text-center">
        <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-green" />
        </div>
        <h2 className="serif text-3xl text-ink mb-3">{t('empty')}</h2>
        <p className="text-stone mb-8">{t('emptyMessage')}</p>
        <Link href={`/${locale}/shop`} className="btn-primary text-base px-8 py-3">
          {t('shopNow')}
        </Link>

        {/* Suggested products */}
        <div className="mt-16 text-start">
          <h3 className="serif text-2xl text-ink mb-6">You Might Like</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {suggestedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-green-tint border-b border-line">
        <div className="container-max py-3">
          <nav className="flex items-center gap-1.5 text-sm text-stone">
            <Link href={`/${locale}`} className="hover:text-green">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-ink font-medium">{t('title')}</span>
          </nav>
        </div>
      </div>

      <div className="container-max py-8">
        <h1 className="serif text-3xl text-ink mb-2">{t('title')}</h1>
        <p className="text-stone text-sm mb-8">{t('items', { count: items.length })}</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Free shipping progress */}
            <div className="p-4 bg-green-tint border border-green/10 rounded-md">
              <p className="text-sm font-medium text-green mb-2">
                {freeShippingProgress >= 100
                  ? t('freeShippingUnlocked')
                  : t('freeShippingProgress', { amount: amountUntilFree.toLocaleString() })}
              </p>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, freeShippingProgress)}%` }}
                />
              </div>
            </div>

            {/* Items */}
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 border border-line rounded-md">
                <div className="w-24 h-24 bg-green-tint rounded-sm flex-shrink-0 overflow-hidden">
                  <ProductImage src={item.image} alt={item.name} fallback="🕋" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/${locale}/products/${item.slug}`}
                        className="font-semibold text-ink hover:text-green transition-colors leading-snug"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-stone mt-0.5">
                        {item.tier}
                        {item.size && ` · Size: ${item.size}`}
                        {item.color && ` · ${item.color}`}
                        {item.scent && ` · ${item.scent}`}
                      </p>
                      {item.hasGiftWrap && (
                        <p className="flex items-center gap-1 text-xs text-gold-deep mt-1">
                          <Gift className="w-3 h-3" />
                          Gift wrap added
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-stone hover:text-alert transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-line rounded-sm overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-stone hover:bg-green-tint transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-stone hover:bg-green-tint transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-ink">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      {item.compareAtPrice && (
                        <p className="text-xs text-stone line-through">
                          {formatPrice(item.compareAtPrice * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 text-sm font-medium text-green hover:text-gold transition-colors"
            >
              ← {t('continueShopping')}
            </Link>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-paper border border-line rounded-md p-5 sticky top-24">
              <h3 className="font-bold text-ink mb-4">Order Summary</h3>

              {/* Coupon */}
              {!couponCode ? (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1.5 block">
                    {t('couponCode')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={t('couponPlaceholder')}
                      className="flex-1 input-base text-xs py-2"
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="btn-outline text-xs px-3 py-2 whitespace-nowrap"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-alert mt-1">{couponError}</p>
                  )}
                  {couponSuccess && (
                    <p className="text-xs text-green mt-1 font-medium">{t('couponApplied')}</p>
                  )}
                  <p className="text-xs text-stone mt-1">Try: WELCOME10, HAJJ2025</p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-tint border border-green/10 rounded-sm px-3 py-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-3.5 h-3.5 text-green" />
                    <span className="font-semibold text-green">{couponCode}</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-stone hover:text-alert transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-3 text-sm border-t border-line pt-4">
                <div className="flex justify-between">
                  <span className="text-stone">{t('subtotal')}</span>
                  <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-alert">
                    <span>{t('discount')}</span>
                    <span className="font-semibold">−{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone">{t('shipping')}</span>
                  <span className={shipping === 0 ? 'text-green font-semibold' : 'font-medium text-ink'}>
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-line pt-3">
                  <span>{t('total')}</span>
                  <span className="text-green">{formatPrice(total)}</span>
                </div>
              </div>

              <Link
                href={`/${locale}/checkout`}
                className="btn-primary w-full justify-center text-base py-3 mt-5"
              >
                {t('checkout')}
                <ArrowRight className="w-4 h-4 ms-1" />
              </Link>

              {/* Payment methods */}
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                {['JazzCash', 'Easypaisa', 'Visa', 'MC', 'COD'].map((pm) => (
                  <span
                    key={pm}
                    className="text-[10px] font-semibold text-stone border border-line px-1.5 py-0.5 rounded-sm"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
