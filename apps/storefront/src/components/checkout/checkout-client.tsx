'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { CheckCircle, ChevronRight, Lock, CreditCard, ClipboardList } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Address, PaymentMethod, ShippingMethod } from '@/types'

type Step = 'address' | 'payment' | 'review' | 'success'

const STEPS: { key: Step; label: string; icon: typeof Lock }[] = [
  { key: 'address', label: 'Address', icon: ClipboardList },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'review', label: 'Review', icon: Lock },
]

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Azad Kashmir', 'Gilgit-Baltistan']

export function CheckoutClient() {
  const locale = useLocale()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const clearCart = useCartStore((s) => s.clearCart)

  const [step, setStep] = useState<Step>('address')
  const [orderNumber] = useState(`YH-2025-${Math.floor(1000 + Math.random() * 8999)}`)

  const [address, setAddress] = useState<Partial<Address>>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: false,
  })
  // Standard delivery is the only shipping method offered
  const shippingMethod: ShippingMethod = 'standard'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('jazzcash')

  const shippingCost = subtotal - couponDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 299
  const total = Math.max(0, subtotal - couponDiscount + shippingCost)

  const stepIndex = (s: Step) => STEPS.findIndex((st) => st.key === s)
  const currentIndex = stepIndex(step)

  const handlePlaceOrder = () => {
    clearCart()
    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="container-max py-20 text-center max-w-lg">
        <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green" />
        </div>
        <h2 className="serif text-3xl text-ink mb-3">Order Placed!</h2>
        <p className="text-stone mb-2">
          JazakAllah khair! Your order <strong className="text-ink">{orderNumber}</strong> has been placed successfully.
        </p>
        <p className="text-sm text-stone mb-8">
          You will receive a confirmation via WhatsApp shortly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/${locale}/account/orders`} className="btn-primary">
            Track My Order
          </Link>
          <Link href={`/${locale}/shop`} className="btn-outline">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-paper min-h-screen">
      <div className="container-max py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="serif text-3xl text-ink mb-6">Checkout</h1>

          {/* Step indicators */}
          <div className="flex items-center justify-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => i < currentIndex && setStep(s.key)}
                  disabled={i > currentIndex}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                    step === s.key
                      ? 'text-green font-bold'
                      : i < currentIndex
                      ? 'text-green/70 cursor-pointer hover:text-green'
                      : 'text-stone cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                      step === s.key
                        ? 'bg-green text-white'
                        : i < currentIndex
                        ? 'bg-green/20 text-green'
                        : 'bg-stone/20 text-stone'
                    )}
                  >
                    {i < currentIndex ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-stone mx-1" />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2">
              {/* ── Address ────────────────────────────────────── */}
              {step === 'address' && (
                <div className="bg-white border border-line rounded-md p-6 space-y-4">
                  <h2 className="font-bold text-ink text-lg">Delivery Address</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Full Name *</label>
                      <input
                        value={address.fullName}
                        onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                        className="input-base"
                        placeholder="Muhammad Ali"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Phone *</label>
                      <input
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        className="input-base"
                        placeholder="+92 300 1234567"
                        type="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Address Line 1 *</label>
                    <input
                      value={address.addressLine1}
                      onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                      className="input-base"
                      placeholder="House/Flat number, Street"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Address Line 2 (optional)</label>
                    <input
                      value={address.addressLine2}
                      onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                      className="input-base"
                      placeholder="Area, Neighbourhood"
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">City *</label>
                      <input
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="input-base"
                        placeholder="Lahore"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Province *</label>
                      <select
                        value={address.province}
                        onChange={(e) => setAddress({ ...address, province: e.target.value })}
                        className="input-base"
                      >
                        <option value="">Select</option>
                        {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Postal Code</label>
                      <input
                        value={address.postalCode}
                        onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                        className="input-base"
                        placeholder="54000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('payment')}
                    className="btn-primary w-full justify-center py-3 mt-2"
                  >
                    Continue to Payment
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Payment ─────────────────────────────────────── */}
              {step === 'payment' && (
                <div className="bg-white border border-line rounded-md p-6 space-y-3">
                  <h2 className="font-bold text-ink text-lg">Payment Method</h2>

                  {[
                    {
                      key: 'jazzcash' as PaymentMethod,
                      label: 'JazzCash',
                      icon: '💳',
                      desc: 'Pay via JazzCash mobile wallet',
                    },
                    {
                      key: 'easypaisa' as PaymentMethod,
                      label: 'Easypaisa',
                      icon: '📱',
                      desc: 'Pay via Easypaisa mobile wallet',
                    },
                    {
                      key: 'card' as PaymentMethod,
                      label: 'Credit / Debit Card',
                      icon: '💳',
                      desc: 'Visa, Mastercard — secure payment',
                    },
                    {
                      key: 'bank_transfer' as PaymentMethod,
                      label: 'Bank Transfer',
                      icon: '🏦',
                      desc: 'Transfer to our bank account',
                    },
                    {
                      key: 'cod' as PaymentMethod,
                      label: 'Cash on Delivery',
                      icon: '💵',
                      desc: 'Open & check first, then pay.',
                      badge: 'Most Popular',
                    },
                  ].map((option) => (
                    <label
                      key={option.key}
                      className={cn(
                        'flex items-center gap-4 p-4 border rounded-md cursor-pointer transition-colors',
                        paymentMethod === option.key
                          ? 'border-green bg-green-tint'
                          : 'border-line hover:border-green/40'
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === option.key}
                        onChange={() => setPaymentMethod(option.key)}
                        className="w-4 h-4 text-green"
                      />
                      <span className="text-xl">{option.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{option.label}</span>
                          {option.badge && (
                            <span className="text-[10px] font-bold bg-gold text-ink px-1.5 py-0.5 rounded-sm">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone">{option.desc}</p>
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={() => setStep('review')}
                    className="btn-primary w-full justify-center py-3 mt-2"
                  >
                    Review Order
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Review ──────────────────────────────────────── */}
              {step === 'review' && (
                <div className="bg-white border border-line rounded-md p-6 space-y-5">
                  <h2 className="font-bold text-ink text-lg">Review Your Order</h2>

                  {/* Delivery address */}
                  <div className="p-4 bg-paper rounded-sm border border-line">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-stone uppercase">Delivery To</p>
                      <button onClick={() => setStep('address')} className="text-xs text-green hover:underline">Edit</button>
                    </div>
                    <p className="font-semibold text-ink">{address.fullName || 'Muhammad Ali'}</p>
                    <p className="text-sm text-stone">{address.phone || '+92 300 1234567'}</p>
                    <p className="text-sm text-stone">{address.addressLine1 || 'House 42, Street 5'}, {address.city || 'Lahore'}, {address.province || 'Punjab'}</p>
                  </div>

                  {/* Shipping & Payment summary */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-paper rounded-sm border border-line">
                      <p className="text-xs font-semibold text-stone uppercase mb-1">Shipping</p>
                      <p className="font-semibold text-ink">Standard Delivery</p>
                      <p className="text-xs text-stone mt-0.5">3–5 business days</p>
                    </div>
                    <div className="p-3 bg-paper rounded-sm border border-line">
                      <p className="text-xs font-semibold text-stone uppercase mb-1">Payment</p>
                      <p className="font-semibold text-ink capitalize">{paymentMethod.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 bg-green-tint rounded-sm flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate">{item.name}</p>
                          <p className="text-xs text-stone">Qty {item.quantity} · {item.tier}</p>
                        </div>
                        <p className="font-bold text-ink">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-stone text-center">
                    By placing this order you agree to our Terms & Conditions.
                  </p>

                  <button
                    onClick={handlePlaceOrder}
                    className="btn-primary w-full justify-center py-3.5 text-base"
                  >
                    <Lock className="w-4 h-4" />
                    Place Order — {formatPrice(total)}
                  </button>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-line rounded-md p-5 sticky top-24">
                <h3 className="font-bold text-ink mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="text-stone truncate flex-1">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-medium text-ink flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-line pt-3 mt-3 space-y-2">
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-alert text-sm">
                        <span>Discount</span>
                        <span>−{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">Shipping</span>
                      <span className={shippingCost === 0 ? 'text-green font-semibold' : 'text-ink'}>
                        {shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t border-line pt-2">
                      <span>Total</span>
                      <span className="text-green">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
