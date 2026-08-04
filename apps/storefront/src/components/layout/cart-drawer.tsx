'use client'

import { useTranslations, useLocale } from 'next-intl'
import { X, ShoppingBag, Trash2, Plus, Minus, Gift } from 'lucide-react'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { ProductImage } from '@/components/ui/product-image'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const t = useTranslations('cart')
  const locale = useLocale()
  const isOpen = useCartStore((s) => s.isOpen)
  const closeCart = useCartStore((s) => s.closeCart)
  const items = useCartStore((s) => s.items)
  const itemCount = useCartStore((s) => s.itemCount())
  const subtotal = useCartStore((s) => s.subtotal())
  const total = useCartStore((s) => s.total())
  const shipping = useCartStore((s) => s.shipping())
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const freeShippingProgress = useCartStore((s) => s.freeShippingProgress())
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  const amountUntilFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 end-0 z-50 w-full max-w-[420px]',
          'bg-white flex flex-col shadow-lg animate-slide-in-right'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green" />
            <h2 className="text-base font-bold text-ink">{t('title')}</h2>
            {itemCount > 0 && (
              <span className="bg-green text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-green" />
            </div>
            <div>
              <p className="font-bold text-ink mb-1">{t('empty')}</p>
              <p className="text-sm text-stone">{t('emptyMessage')}</p>
            </div>
            <Link
              href={`/${locale}/shop`}
              onClick={closeCart}
              className="btn-primary"
            >
              {t('shopNow')}
            </Link>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-5 py-3 bg-green-tint border-b border-line">
              <p className="text-xs font-medium text-green mb-1.5">
                {freeShippingProgress >= 100
                  ? t('freeShippingUnlocked')
                  : t('freeShippingProgress', { amount: formatPrice(amountUntilFreeShipping, '') })}
              </p>
              <div className="h-1.5 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, freeShippingProgress)}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 bg-green-tint rounded-sm flex-shrink-0 overflow-hidden">
                    <ProductImage src={item.image} alt={item.name} fallback="🕋" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-snug truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-stone mt-0.5">
                      {item.tier}
                      {item.size && ` · ${item.size}`}
                      {item.color && ` · ${item.color}`}
                    </p>
                    {item.hasGiftWrap && (
                      <p className="flex items-center gap-1 text-xs text-gold-deep mt-0.5">
                        <Gift className="w-3 h-3" />
                        {t('giftWrap')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity */}
                      <div className="flex items-center gap-2 border border-line rounded-sm">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-stone hover:text-ink hover:bg-green-tint transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold text-ink w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-stone hover:text-ink hover:bg-green-tint transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-ink">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-stone hover:text-alert transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-line space-y-3">
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone">{t('discount')}</span>
                  <span className="text-alert font-semibold">−{formatPrice(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-stone">{t('shipping')}</span>
                <span className={shipping === 0 ? 'text-green font-semibold' : 'text-ink'}>
                  {shipping === 0 ? t('freeShipping' as never) ?? 'Free' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-line pt-3">
                <span>{t('total')}</span>
                <span className="text-green">{formatPrice(total)}</span>
              </div>

              <Link
                href={`/${locale}/checkout`}
                onClick={closeCart}
                className="btn-primary w-full justify-center text-base py-3"
              >
                {t('checkout')}
              </Link>
              <Link
                href={`/${locale}/cart`}
                onClick={closeCart}
                className="btn-outline w-full justify-center text-sm"
              >
                {t('continueShopping')}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
