import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Storefront-safe subset of the `settings` table.
 *
 * Only these keys are ever exposed. The table is a general key/value store
 * that staff can write to, so returning it wholesale would publish whatever
 * an admin happens to add next — including anything credential-shaped.
 */
const PUBLIC_KEYS = {
  free_shipping_threshold: { field: 'freeShippingThreshold', fallback: 299900 },
  standard_shipping_cost: { field: 'standardShippingCost', fallback: 29900 },
  express_shipping_cost: { field: 'expressShippingCost', fallback: 49900 },
  gift_wrap_price: { field: 'giftWrapPrice', fallback: 9900 },
} as const

export interface PublicSettings {
  /** All money values are paisas, consistent with the rest of the API. */
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
  giftWrapPrice: number
  codFee: number
  currency: string
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * These values were previously hardcoded in the storefront
   * (`FREE_SHIPPING_THRESHOLD = 5000`) while the API computed shipping from
   * the database (₨2,999). The cart's progress bar and the total a customer
   * was actually charged therefore disagreed. This endpoint is the single
   * source of truth for both.
   */
  async findPublic(): Promise<PublicSettings> {
    const keys = Object.keys(PUBLIC_KEYS)
    const rows = await this.prisma.setting.findMany({ where: { key: { in: keys } } })
    const byKey = new Map(rows.map((r) => [r.key, r.value]))

    const result = {} as Record<string, number>
    for (const [key, { field, fallback }] of Object.entries(PUBLIC_KEYS)) {
      const raw = byKey.get(key)
      const parsed = raw !== undefined ? parseInt(raw, 10) : NaN
      // A missing or corrupt row must not zero out a threshold — that would
      // silently make all shipping free.
      result[field] = Number.isFinite(parsed) ? parsed : fallback
    }

    return {
      freeShippingThreshold: result.freeShippingThreshold,
      standardShippingCost: result.standardShippingCost,
      expressShippingCost: result.expressShippingCost,
      giftWrapPrice: result.giftWrapPrice,
      codFee: 0,
      currency: '₨',
    }
  }
}
