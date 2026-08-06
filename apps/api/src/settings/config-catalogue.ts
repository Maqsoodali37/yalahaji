import { ConfigValueType } from '@prisma/client'

/**
 * The configuration the shop ships with.
 *
 * This is a *seed list*, not a schema. Nothing here constrains what the table
 * can hold — staff can add a key through the admin API and it works with no
 * code change, which is the point of the key/value design. This list exists so
 * a fresh install has sensible values and so every shipped key carries a
 * description rather than being a bare string someone has to guess at.
 *
 * Money is in **paisas**, consistent with the rest of the API. Storing rupees
 * here and paisas on orders is exactly the mismatch the adapters layer exists
 * to prevent.
 */
export interface ConfigDefinition {
  key: string
  value: string
  valueType: ConfigValueType
  category: string
  description: string
  /** Exposed by GET /settings/public. Default off — publish deliberately. */
  isPublic: boolean
}

export const CONFIG_CATEGORIES = {
  SHIPPING: 'shipping',
  CHECKOUT: 'checkout',
  PAYMENT: 'payment',
  STORE: 'store',
  INVENTORY: 'inventory',
  FEATURES: 'features',
  TAX: 'tax',
} as const

export const CONFIG_CATALOGUE: ConfigDefinition[] = [
  // ── Shipping ──────────────────────────────────────────────────────────────
  {
    key: 'free_shipping_threshold',
    value: '299900',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.SHIPPING,
    description: 'Order total (paisas) above which standard shipping is free',
    isPublic: true,
  },
  {
    key: 'standard_shipping_cost',
    value: '29900',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.SHIPPING,
    description: 'Standard delivery charge in paisas',
    isPublic: true,
  },
  {
    key: 'express_shipping_cost',
    value: '49900',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.SHIPPING,
    description: 'Express delivery charge in paisas',
    isPublic: true,
  },

  // ── Checkout ──────────────────────────────────────────────────────────────
  {
    key: 'cod_fee',
    value: '0',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.CHECKOUT,
    description: 'Surcharge in paisas applied to cash-on-delivery orders',
    isPublic: true,
  },
  {
    key: 'min_order_amount',
    value: '0',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.CHECKOUT,
    description: 'Minimum order subtotal in paisas. 0 disables the check.',
    isPublic: true,
  },
  {
    key: 'gift_wrap_price',
    value: '9900',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.CHECKOUT,
    description: 'Gift wrap charge per item in paisas',
    isPublic: true,
  },
  {
    key: 'guest_checkout_enabled',
    value: 'true',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.CHECKOUT,
    description: 'Allow orders without an account',
    isPublic: true,
  },

  // ── Tax ───────────────────────────────────────────────────────────────────
  {
    key: 'tax_percentage',
    value: '0',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.TAX,
    description: 'Sales tax as a percentage of the order subtotal, e.g. 17 for 17%',
    isPublic: true,
  },

  // ── Currency ──────────────────────────────────────────────────────────────
  {
    key: 'currency',
    value: 'PKR',
    valueType: ConfigValueType.string,
    category: CONFIG_CATEGORIES.STORE,
    description: 'ISO 4217 currency code',
    isPublic: true,
  },
  {
    key: 'currency_symbol',
    value: '₨',
    valueType: ConfigValueType.string,
    category: CONFIG_CATEGORIES.STORE,
    description: 'Symbol shown before prices on the storefront',
    isPublic: true,
  },

  // ── Payment availability ──────────────────────────────────────────────────
  //
  // These gate what checkout offers. They are *narrowing* switches: turning one
  // on does not conjure a gateway. `online_payment_enabled` stays false until
  // JazzCash/Easypaisa are actually integrated — see
  // `common/payment-methods.ts`, which is the hard allowlist.
  {
    key: 'cod_enabled',
    value: 'true',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.PAYMENT,
    description: 'Offer cash on delivery at checkout',
    isPublic: true,
  },
  {
    key: 'online_payment_enabled',
    value: 'false',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.PAYMENT,
    description:
      'Offer card and wallet payments. Requires a gateway integration — enabling this alone does not make them selectable.',
    isPublic: true,
  },
  {
    key: 'wallet_payment_enabled',
    value: 'false',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.PAYMENT,
    description: 'Offer JazzCash / Easypaisa wallet payments. Requires a gateway integration.',
    isPublic: true,
  },

  // ── Store information ─────────────────────────────────────────────────────
  {
    key: 'store_name',
    value: 'Yala Haji',
    valueType: ConfigValueType.string,
    category: CONFIG_CATEGORIES.STORE,
    description: 'Shop name shown in the header, emails and page titles',
    isPublic: true,
  },
  {
    key: 'store_email',
    value: 'salam@yalahaji.com',
    valueType: ConfigValueType.string,
    category: CONFIG_CATEGORIES.STORE,
    description: 'Public contact email',
    isPublic: true,
  },
  {
    key: 'store_phone',
    value: '+923001234567',
    valueType: ConfigValueType.string,
    category: CONFIG_CATEGORIES.STORE,
    description: 'Public contact phone number',
    isPublic: true,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    key: 'low_stock_threshold',
    value: '5',
    valueType: ConfigValueType.number,
    category: CONFIG_CATEGORIES.INVENTORY,
    // Private: telling shoppers the exact restock trigger is operational detail.
    description: 'Default units-remaining at which a variant counts as low stock',
    isPublic: false,
  },

  // ── Feature flags ─────────────────────────────────────────────────────────
  {
    key: 'maintenance_mode',
    value: 'false',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.FEATURES,
    description: 'Put the storefront into maintenance mode',
    isPublic: true,
  },
  {
    key: 'coupon_enabled',
    value: 'true',
    valueType: ConfigValueType.boolean,
    category: CONFIG_CATEGORIES.FEATURES,
    description: 'Show the coupon field in cart and checkout',
    isPublic: true,
  },
]
