'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, ChevronRight, Lock, CreditCard, ClipboardList, Copy, Check } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import {
  placeOrder,
  fetchAddresses,
  createAddress,
  ApiError,
  type AddressInput,
} from '@/lib/api'
import { formatAddressLines, isDeliverable, DEFAULT_COUNTRY } from '@/lib/address'
import { AddressForm } from '@/components/account/address-form'
import {
  SavedAddressPicker,
  ChangeAddressPanel,
} from '@/components/checkout/address-book'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  addressRules,
  hasErrors,
  validate,
  PROVINCES,
  type AddressFormValues,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'
import {
  PAYMENT_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethodEnabled,
} from '@/lib/payment-methods'
import type { Address, PaymentMethod, ShippingMethod } from '@/types'
import {
  toAnalyticsItem,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
  trackPurchase,
} from '@/lib/analytics'

type Step = 'address' | 'payment' | 'review' | 'success'

const STEPS: { key: Step; label: string; icon: typeof Lock }[] = [
  { key: 'address', label: 'Address', icon: ClipboardList },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'review', label: 'Review', icon: Lock },
]

/** GA4's shipping_tier — one option today, but the field is required. */
const SHIPPING_TIER = 'Standard'

/**
 * The order number on the confirmation screen.
 *
 * Tracking accepts the number alone, so this string is the only thing standing
 * between a guest and their delivery status — and the only thing standing
 * between a stranger and it too. Hence both halves of this component: it is
 * shown large and copyable so the customer keeps it, and labelled as something
 * to keep private so they think before forwarding a screenshot.
 */
function OrderNumberPanel({ number, isGuest }: { number: string; isGuest: boolean }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number)
      setCopied(true)
      // Long enough to read, short enough that the button is ready again if
      // the paste did not land where they meant it to.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access is denied over plain HTTP and in some in-app
      // browsers. The number is selectable text either way, so failing
      // quietly leaves the customer no worse off than before they clicked.
    }
  }

  return (
    <div className="bg-green-tint border border-green/20 rounded-md p-5">
      <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
        Your order number
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <code className="serif text-2xl text-ink tracking-wide select-all">{number}</code>
        <button
          type="button"
          onClick={copy}
          className="p-2 rounded-sm hover:bg-white/60 transition-colors text-stone hover:text-green"
          aria-label={copied ? 'Order number copied' : 'Copy order number'}
        >
          {copied ? <Check className="w-4 h-4 text-green" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-stone mt-3">
        {isGuest
          ? 'Save this — it is how you track your order, so keep it to yourself.'
          : 'Also saved to your account. Keep it to yourself — anyone with it can view this order.'}
      </p>
    </div>
  )
}

export function CheckoutClient() {
  const locale = useLocale()
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const couponCode = useCartStore((s) => s.couponCode)
  const clearCart = useCartStore((s) => s.clearCart)

  const user = useAuthStore((s) => s.user)
  const isHydrating = useAuthStore((s) => s.isHydrating)

  const [step, setStep] = useState<Step>('address')
  // Assigned by the API on success. It used to be invented client-side, so the
  // number on this screen had no relationship to any real order.
  const [orderNumber, setOrderNumber] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')

  const [address, setAddress] = useState<Partial<Address>>({
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    province: '',
    country: DEFAULT_COUNTRY,
    postalCode: '',
  })

  /**
   * Which saved address the form was filled from, if any.
   *
   * Held so an unedited selection can be sent as `addressId` rather than as an
   * inline copy — otherwise every checkout against a saved address wrote a
   * duplicate row and the customer's address book grew by one per order.
   */
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showChangePanel, setShowChangePanel] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  /** Only offered to signed-in customers typing an address by hand. */
  const [saveToAccount, setSaveToAccount] = useState(false)
  const [makeDefault, setMakeDefault] = useState(false)

  const queryClient = useQueryClient()

  /**
   * The customer's saved addresses, fetched once with the checkout page.
   *
   * `enabled` keeps this off entirely for guests: there is no account behind
   * the request and firing it would be a guaranteed 401 on every guest
   * checkout. Waiting out `isHydrating` avoids the same 401 in the frame
   * before a signed-in customer's token is confirmed on a hard refresh.
   *
   * Because the whole list is cached here, switching between saved addresses
   * is a state change rather than a round trip — no request fires when the
   * customer taps a different card.
   */
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: fetchAddresses,
    enabled: Boolean(user) && !isHydrating,
    // The address book rarely changes mid-checkout, and a refetch on tab focus
    // would replace the list under a half-filled form.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const [addressErrors, setAddressErrors] = useState<FieldErrors<AddressFormValues>>({})
  // Errors appear on the first submit attempt, not while someone is still
  // typing their name for the first time. After that the form validates live,
  // so a correction clears the message immediately.
  const [addressSubmitted, setAddressSubmitted] = useState(false)

  /**
   * One update path for every field, so validation can never be wired to some
   * inputs and forgotten on others.
   */
  const setField = (field: keyof AddressFormValues, value: string) => {
    const next = { ...address, [field]: value }
    setAddress(next)
    if (addressSubmitted) setAddressErrors(validate(next as AddressFormValues, addressRules))
    // Typing over a prefilled address makes it a one-off for this order: the
    // saved row is left alone, and what goes to the API is the edited copy.
    // Silently updating the saved address instead would rewrite an address the
    // customer uses for other things.
    if (selectedAddressId) setSelectedAddressId(null)
  }

  /** Copy a saved address into the form, replacing whatever is there. */
  const applyAddress = (a: Address) => {
    const next: Partial<Address> = {
      fullName: a.fullName,
      phone: a.phone,
      email: a.email ?? '',
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? '',
      area: a.area ?? '',
      city: a.city,
      province: a.province,
      country: a.country || DEFAULT_COUNTRY,
      postalCode: a.postalCode ?? '',
    }
    setAddress(next)
    setSelectedAddressId(a.id)
    // Re-validate immediately when the customer has already hit Continue once,
    // so switching to a complete address clears the errors rather than leaving
    // them on screen against fields that are now fine.
    if (addressSubmitted) setAddressErrors(validate(next as AddressFormValues, addressRules))
  }

  /**
   * Fill the form from the default address, once, on arrival.
   *
   * `autofilled` rather than a dependency on `savedAddresses` alone: the query
   * resolving must not overwrite an address the customer has already started
   * typing, and it must not undo a deliberate switch to a different card.
   * Falls back to the first address when none is flagged default, because an
   * account with addresses and no default still wants one less form to fill.
   */
  const autofilled = useRef(false)
  useEffect(() => {
    if (autofilled.current || !user || savedAddresses.length === 0) return
    const preferred =
      savedAddresses.find((a) => a.isDefaultShipping) ?? savedAddresses[0]
    if (!preferred) return
    autofilled.current = true
    applyAddress(preferred)
    // applyAddress is stable enough for this one-shot; re-running on every
    // render of it would defeat the guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedAddresses])

  /** A saved address chosen but missing something the courier needs. */
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId)
  const selectedIsIncomplete = Boolean(selectedAddress) && !isDeliverable(selectedAddress)

  /** Save a brand-new address to the account and use it for this order. */
  const handleAddAddress = async (values: AddressInput) => {
    const created = await createAddress(values)
    // Refetch so the picker shows it, and so a new default demotes the old one
    // — only the server knows which row that was.
    await queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
    applyAddress(created)
    setShowAddForm(false)
    setShowChangePanel(false)
  }
  // Standard delivery is the only shipping method offered
  const shippingMethod: ShippingMethod = 'standard'
  // Defaults to cash on delivery. This used to default to `jazzcash`, which is
  // no longer selectable — anyone clicking straight through the payment step
  // would have submitted a method with no gateway behind it.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD)

  // Shipping and total come from the store, which reads live settings — the
  // API recomputes both server-side anyway, so these are display-only.
  const shippingCost = useCartStore((s) => s.shipping())
  const goodsTotal = useCartStore((s) => s.total())
  const settings = useCartStore((s) => s.settings)

  // Mirrors the server's calculation in OrdersService.create. It has to: the
  // API adds a COD surcharge and tax, and a checkout that showed a total
  // without them would quote one figure and charge another — the same class of
  // bug as the old ₨5,000-vs-₨2,999 shipping mismatch.
  const codSurcharge = paymentMethod === 'cod' ? settings.codFee : 0
  const subtotalAfterDiscount = Math.max(0, subtotal - couponDiscount)
  const tax =
    settings.taxPercentage > 0
      ? Math.round((subtotalAfterDiscount * settings.taxPercentage) / 100)
      : 0
  const total = goodsTotal + codSurcharge + tax

  const stepIndex = (s: Step) => STEPS.findIndex((st) => st.key === s)
  const currentIndex = stepIndex(step)

  // begin_checkout must fire once per visit to this screen, not once per
  // render and not again when the visitor steps back to the address form.
  const beganCheckout = useRef(false)
  useEffect(() => {
    if (beganCheckout.current || items.length === 0) return
    beganCheckout.current = true
    trackBeginCheckout(items.map((i) => toAnalyticsItem(i)), {
      value: total,
      coupon: couponCode,
    })
    // Deliberately not reacting to total/coupon changes — a coupon applied
    // mid-checkout should not re-open the funnel step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  /**
   * Gate for leaving the address step. Returns false and surfaces every
   * failing field at once — walking someone through errors one at a time is
   * how a five-field form turns into five round trips.
   */
  const validateAddress = (): boolean => {
    const errors = validate(address as AddressFormValues, addressRules)
    setAddressErrors(errors)
    setAddressSubmitted(true)

    if (hasErrors(errors)) {
      // Move focus to the problem so the message is not announced off-screen
      // on a long form.
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus({ preventScroll: false })
      })
      return false
    }
    return true
  }

  /** Advances a step and emits the funnel event that belongs to leaving it. */
  const advanceTo = (next: Step) => {
    if (next === 'payment' && !validateAddress()) return

    if (next === 'payment') {
      trackAddShippingInfo(items.map((i) => toAnalyticsItem(i)), {
        value: total,
        shippingTier: SHIPPING_TIER,
        coupon: couponCode,
      })
    } else if (next === 'review') {
      trackAddPaymentInfo(items.map((i) => toAnalyticsItem(i)), {
        value: total,
        paymentType: paymentMethod,
        coupon: couponCode,
      })
    }
    setStep(next)
  }

  const handlePlaceOrder = async () => {
    // Re-check rather than trusting that the address step gated correctly.
    // The step indicator lets people jump backwards, and an edit made there
    // must not be able to reach the API unvalidated.
    if (!validateAddress()) {
      setStep('address')
      return
    }

    if (items.length === 0) {
      setPlaceError('Your basket is empty.')
      return
    }

    // The API enforces this too. Checking here means the customer finds out
    // before filling in an address rather than after submitting one.
    if (settings.minOrderAmount > 0 && subtotalAfterDiscount < settings.minOrderAmount) {
      setPlaceError(
        `Orders must total at least ${formatPrice(settings.minOrderAmount)}. Please add a little more to your basket.`,
      )
      return
    }

    // Belt and braces against a method that was selectable when the page
    // loaded and is not now. The API rejects these too, but doing it here
    // keeps the customer on the step where they can fix it.
    if (!isPaymentMethodEnabled(paymentMethod)) {
      setPaymentMethod(DEFAULT_PAYMENT_METHOD)
      setPlaceError('That payment method isn’t available yet. Please choose another.')
      setStep('payment')
      return
    }

    setPlacing(true)
    setPlaceError('')

    try {
      // Only variant ids and quantities are sent. The API recomputes every
      // price, discount and shipping cost from the database, so nothing the
      // client believes about the total can influence what is charged.
      // An untouched saved address is sent by id; anything typed or edited is
      // sent inline. Sending the inline copy in both cases would write a
      // duplicate address row on every checkout, so a customer who ordered
      // monthly ended up with twelve copies of their home address.
      //
      // Either way the API copies the fields onto the order as a snapshot, so
      // editing or deleting the saved address afterwards cannot change where
      // this order is recorded as having gone.
      const addressPayload =
        selectedAddressId && !selectedIsIncomplete
          ? { addressId: selectedAddressId }
          : {
              address: {
                // The checkout form has no label field, and `Address.label`
                // defaults to "Home" in the schema — so a one-off delivery to
                // a relative would have been filed, and shown to staff, as the
                // customer's home address. Falling back to the city mirrors
                // what AddressForm does with a blank label.
                label: address.city?.trim() || undefined,
                // And the enum alongside it, or the fallback above is undone:
                // `labelType` defaults to `home` in the schema, so this
                // one-off address would show a "Home" chip in the address book
                // next to the customer's actual home address. `other` is the
                // truth — checkout collects a delivery address, not a category.
                //
                // `as const`, not just `'other'`: this object lives inside an
                // unannotated `const addressPayload = cond ? {...} : {...}`,
                // so nothing here is contextually typed against
                // `PlaceOrderInput` at the point of declaration. Without the
                // assertion TypeScript widens the literal to plain `string`
                // right there, and that widened type is what `addressPayload`
                // carries by the time it's spread into `placeOrder(...)` below
                // — too late for the call's own contextual typing to narrow it
                // back to `AddressLabelType`.
                labelType: 'other' as const,
                fullName: address.fullName ?? '',
                phone: address.phone ?? '',
                email: address.email || undefined,
                addressLine1: address.addressLine1 ?? '',
                addressLine2: address.addressLine2 || undefined,
                area: address.area || undefined,
                city: address.city ?? '',
                province: address.province ?? '',
                country: address.country || DEFAULT_COUNTRY,
                postalCode: address.postalCode || undefined,
              },
              // Ignored server-side for guests, who have no account to save to.
              ...(user && saveToAccount
                ? { saveAddress: true, setDefaultAddress: makeDefault }
                : {}),
            }

      const order = await placeOrder({
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          hasGiftWrap: i.hasGiftWrap,
          giftMessage: i.giftMessage,
        })),
        ...addressPayload,
        paymentMethod,
        shippingMethod,
        couponCode,
        // Guests must be reachable about the order; signed-in customers
        // already are, via their account.
        ...(user ? {} : { guestPhone: address.phone ?? '' }),
      })

      setOrderNumber(order.number)

      // Sent before clearCart(), because the items are read from the store and
      // clearing first would send an empty purchase. order.number is the
      // server's id, so GA4's transaction_id deduplication actually works —
      // a refresh of the success screen cannot invent a second order.
      trackPurchase(
        items.map((i) => toAnalyticsItem(i)),
        {
          transactionId: order.number,
          value: total,
          shipping: shippingCost,
          coupon: couponCode,
        },
      )

      // A checkout that saved a new address leaves the cached list a row short
      // for the rest of the session.
      if (user && saveToAccount) {
        queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      }

      // Only clear once the order actually exists — clearing first would lose
      // the basket if the request failed.
      clearCart()
      setStep('success')
    } catch (e) {
      setPlaceError(
        e instanceof ApiError
          ? e.message
          : 'Could not place your order. Please try again.',
      )
    } finally {
      setPlacing(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="container-max py-20 text-center max-w-lg">
        <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green" />
        </div>
        <h2 className="serif text-3xl text-ink mb-3">Order Placed!</h2>
        <p className="text-stone mb-6">
          JazakAllah khair! Your order has been placed successfully.
        </p>

        {/*
          The order number is displayed rather than buried in a sentence
          because it is now the credential for tracking — a guest who loses it
          has no other way back to their delivery. Copyable for the same
          reason: retyping a six-character token off a screen is where the
          typos come from.
        */}
        <OrderNumberPanel number={orderNumber} isGuest={!user} />

        <p className="text-sm text-stone mt-6 mb-8">
          You will receive a confirmation via WhatsApp shortly.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/*
            Guests go to the public tracker; signed-in customers go to their
            order list, where the order is already waiting for them. Sending a
            guest to /account/orders — which is what this button used to do —
            landed them on a login wall holding a number they could not use.
          */}
          <Link
            href={user ? `/${locale}/account/orders` : `/${locale}/track-order`}
            className="btn-primary"
          >
            {user ? 'View My Orders' : 'Track My Order'}
          </Link>
          <Link href={`/${locale}/shop`} className="btn-outline">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  // Checked after the success branch on purpose: placing an order empties the
  // basket, so testing this first would swap the confirmation for an
  // empty-basket notice the instant the order succeeded.
  if (items.length === 0) {
    return (
      <div className="container-max py-20 text-center max-w-lg">
        <div className="w-20 h-20 bg-paper border border-line rounded-full flex items-center justify-center mx-auto mb-6">
          <ClipboardList className="w-9 h-9 text-stone" />
        </div>
        <h2 className="serif text-2xl text-ink mb-3">Your basket is empty</h2>
        <p className="text-stone mb-8">Add something to your basket before checking out.</p>
        <Link href={`/${locale}/shop`} className="btn-primary">
          Browse the shop
        </Link>
      </div>
    )
  }

  /*
    `guest_checkout_enabled` is enforced server-side in orders.service.create,
    so this is not the security check — it is the courtesy one. Without it a
    guest filled in a full delivery address, chose a payment method, reached
    the review step and only then learned they needed an account. Asking up
    front costs them one click instead of five minutes.

    `isHydrating` is respected so a signed-in customer refreshing checkout is
    not shown a sign-in wall for the frame before their token is confirmed.
  */
  if (!isHydrating && !user && !settings.guestCheckoutEnabled) {
    return (
      <div className="container-max py-20 text-center max-w-lg">
        <div className="w-20 h-20 bg-green-tint rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-9 h-9 text-green" />
        </div>
        <h2 className="serif text-2xl text-ink mb-3">Please sign in to check out</h2>
        <p className="text-stone mb-8">
          Guest checkout is turned off at the moment. Your basket is saved and will be
          waiting for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout`)}`}
            className="btn-primary"
          >
            Sign In
          </Link>
          <Link
            href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/checkout`)}`}
            className="btn-outline"
          >
            Create Account
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

                  {/*
                    Signed-in customers only. A guest gets the blank form on its
                    own — there is no account to read saved addresses from, and
                    an empty picker urging them to sign in turns a working guest
                    checkout into a nag at the worst moment.
                  */}
                  {user && (
                    <>
                      <SavedAddressPicker
                        addresses={savedAddresses}
                        selectedId={selectedAddressId}
                        onSelect={(id) => {
                          const found = savedAddresses.find((a) => a.id === id)
                          if (found) applyAddress(found)
                        }}
                        onAddNew={() => setShowAddForm(true)}
                        onChangeAddress={() => setShowChangePanel(true)}
                        incomplete={selectedIsIncomplete}
                        onEditIncomplete={() => setSelectedAddressId(null)}
                      />
                      <hr className="border-line" />
                      <p className="text-xs text-stone">
                        {selectedAddressId
                          ? 'Using the address above. Edit any field below to change it for this order only.'
                          : 'Enter the delivery address for this order.'}
                      </p>
                    </>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField label="Full Name" required error={addressErrors.fullName}>
                      {(props) => (
                        <input
                          {...props}
                          value={address.fullName}
                          onChange={(e) => setField('fullName', e.target.value)}
                          className={inputClass(addressErrors.fullName)}
                          placeholder="Muhammad Ali"
                          autoComplete="name"
                        />
                      )}
                    </FormField>

                    <FormField
                      label="Phone"
                      required
                      error={addressErrors.phone}
                      hint="We send delivery updates on WhatsApp."
                    >
                      {(props) => (
                        <input
                          {...props}
                          value={address.phone}
                          onChange={(e) => setField('phone', e.target.value)}
                          className={inputClass(addressErrors.phone)}
                          placeholder="+92 300 1234567"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField label="Address Line 1" required error={addressErrors.addressLine1}>
                    {(props) => (
                      <input
                        {...props}
                        value={address.addressLine1}
                        onChange={(e) => setField('addressLine1', e.target.value)}
                        className={inputClass(addressErrors.addressLine1)}
                        placeholder="House/Flat number, Street"
                        autoComplete="address-line1"
                      />
                    )}
                  </FormField>

                  <FormField label="Address Line 2 (optional)" error={addressErrors.addressLine2}>
                    {(props) => (
                      <input
                        {...props}
                        value={address.addressLine2}
                        onChange={(e) => setField('addressLine2', e.target.value)}
                        className={inputClass(addressErrors.addressLine2)}
                        placeholder="Area, Neighbourhood"
                        autoComplete="address-line2"
                      />
                    )}
                  </FormField>

                  <FormField label="Area (optional)" error={addressErrors.area}>
                    {(props) => (
                      <input
                        {...props}
                        value={address.area ?? ''}
                        onChange={(e) => setField('area', e.target.value)}
                        className={inputClass(addressErrors.area)}
                        placeholder="DHA Phase 5, Gulberg III"
                        autoComplete="address-level3"
                      />
                    )}
                  </FormField>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <FormField label="City" required error={addressErrors.city}>
                      {(props) => (
                        <input
                          {...props}
                          value={address.city}
                          onChange={(e) => setField('city', e.target.value)}
                          className={inputClass(addressErrors.city)}
                          placeholder="Lahore"
                          autoComplete="address-level2"
                        />
                      )}
                    </FormField>

                    <FormField label="Province" required error={addressErrors.province}>
                      {(props) => (
                        <select
                          {...props}
                          value={address.province}
                          onChange={(e) => setField('province', e.target.value)}
                          className={inputClass(addressErrors.province)}
                          autoComplete="address-level1"
                        >
                          <option value="">Select</option>
                          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      )}
                    </FormField>

                    <FormField label="Postal Code" error={addressErrors.postalCode}>
                      {(props) => (
                        <input
                          {...props}
                          value={address.postalCode}
                          onChange={(e) => setField('postalCode', e.target.value)}
                          className={inputClass(addressErrors.postalCode)}
                          placeholder="54000"
                          autoComplete="postal-code"
                          inputMode="numeric"
                        />
                      )}
                    </FormField>
                  </div>

                  {/*
                    Offered only when the address is not an unedited saved one:
                    a "save this" tickbox against an address that is already
                    saved is a control that does nothing. Guests never see it —
                    there is no account behind it.
                  */}
                  {user && !selectedAddressId && (
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveToAccount}
                          onChange={(e) => {
                            setSaveToAccount(e.target.checked)
                            if (!e.target.checked) setMakeDefault(false)
                          }}
                          className="w-4 h-4 accent-green"
                        />
                        Save this address to my account
                      </label>
                      {saveToAccount && (
                        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer ms-6">
                          <input
                            type="checkbox"
                            checked={makeDefault}
                            onChange={(e) => setMakeDefault(e.target.checked)}
                            className="w-4 h-4 accent-green"
                          />
                          Make it my default delivery address
                        </label>
                      )}
                    </div>
                  )}

                  {addressSubmitted && hasErrors(addressErrors) && (
                    <p role="alert" className="text-sm text-alert">
                      Please correct the highlighted fields to continue.
                    </p>
                  )}

                  <button
                    onClick={() => advanceTo('payment')}
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

                  {PAYMENT_OPTIONS.map((option) => {
                    // Two independent gates. `comingSoon` means no gateway
                    // exists — an order placed against one would look paid to
                    // the customer and unpaid to fulfilment. The config flag
                    // is the shop switching off a method that *does* work.
                    const disabledByConfig =
                      option.key === 'cod' ? !settings.codEnabled : false
                    const disabled = Boolean(option.comingSoon) || disabledByConfig
                    const selected = paymentMethod === option.key

                    return (
                      <label
                        key={option.key}
                        aria-disabled={disabled}
                        className={cn(
                          'flex items-center gap-4 p-4 border rounded-md transition-colors',
                          disabled
                            ? 'border-line bg-paper opacity-60 cursor-not-allowed'
                            : selected
                            ? 'border-green bg-green-tint cursor-pointer'
                            : 'border-line hover:border-green/40 cursor-pointer',
                        )}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => !disabled && setPaymentMethod(option.key)}
                          className="w-4 h-4 text-green disabled:cursor-not-allowed"
                        />
                        <span className="text-xl">{option.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'font-semibold',
                                disabled ? 'text-stone' : 'text-ink',
                              )}
                            >
                              {option.label}
                            </span>
                            {option.badge && !disabled && (
                              <span className="text-[10px] font-bold bg-gold text-ink px-1.5 py-0.5 rounded-sm">
                                {option.badge}
                              </span>
                            )}
                            {disabled && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-stone/15 text-stone px-1.5 py-0.5 rounded-sm">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone">{option.desc}</p>
                        </div>
                      </label>
                    )
                  })}

                  <p className="text-xs text-stone pt-1">
                    Online payments are coming soon. For now, orders are paid in cash on
                    delivery.
                  </p>

                  <button
                    onClick={() => advanceTo('review')}
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
                    {/* No placeholder fallbacks. These previously defaulted to
                        an invented name and address, so an empty form showed a
                        plausible delivery address that was never going to be
                        the one on the parcel. */}
                    <p className="font-semibold text-ink">{address.fullName}</p>
                    <p className="text-sm text-stone">{address.phone}</p>
                    {address.email && <p className="text-sm text-stone">{address.email}</p>}
                    {/* Shared with the address book and the order pages, so
                        `area` cannot appear on one screen and vanish on the
                        next — which reads to a customer as data being lost. */}
                    {formatAddressLines(address).map((line) => (
                      <p key={line} className="text-sm text-stone">
                        {line}
                      </p>
                    ))}
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

                  {placeError && (
                    <p
                      role="alert"
                      className="text-sm text-red bg-red/5 border border-red/20 rounded-sm px-3 py-2"
                    >
                      {placeError}
                    </p>
                  )}

                  <button
                    onClick={handlePlaceOrder}
                    // Disabled while in flight so a double-click cannot place
                    // two orders and charge twice.
                    disabled={placing}
                    className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    {placing ? 'Placing order…' : `Place Order — ${formatPrice(total)}`}
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

                    {/* Only rendered when configured, so a shop with no COD fee
                        and no tax sees the same summary as before. */}
                    {codSurcharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone">Cash on delivery fee</span>
                        <span className="text-ink">{formatPrice(codSurcharge)}</span>
                      </div>
                    )}

                    {tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone">Tax ({settings.taxPercentage}%)</span>
                        <span className="text-ink">{formatPrice(tax)}</span>
                      </div>
                    )}

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

      {/*
        Both dialogs live outside the step tree so they survive a step change
        and are not unmounted mid-interaction. The change panel closes when the
        add form opens: stacking two modals leaves the customer two Escapes
        from the form they were filling in.
      */}
      {showChangePanel && !showAddForm && (
        <ChangeAddressPanel
          addresses={savedAddresses}
          selectedId={selectedAddressId}
          onSelect={(id) => {
            const found = savedAddresses.find((a) => a.id === id)
            if (found) applyAddress(found)
          }}
          onAddNew={() => setShowAddForm(true)}
          onClose={() => setShowChangePanel(false)}
        />
      )}

      {/*
        The same dialog the address book uses. A second address form living in
        the checkout tree would be a second place for the field list and the
        validation wiring to drift, and the one that drifts is always the one
        nobody is looking at.
      */}
      {showAddForm && (
        <AddressForm
          onSubmit={handleAddAddress}
          onClose={() => setShowAddForm(false)}
          title="Add a delivery address"
          submitLabel="Save and use"
        />
      )}
    </div>
  )
}
