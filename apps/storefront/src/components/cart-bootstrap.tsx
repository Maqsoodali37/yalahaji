'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cart'

/**
 * Pulls the authoritative cart and store settings once, on mount.
 *
 * The persisted Zustand cart is a first-paint cache — it can be stale (prices
 * changed, stock ran out, or a guest cart was merged into an account on
 * another device). The server is the source of truth, so we reconcile as soon
 * as the app is interactive.
 *
 * Settings are fetched here too rather than per-component so the free-shipping
 * threshold is consistent everywhere it appears: the drawer progress bar, the
 * cart page, and the checkout summary.
 */
export function CartBootstrap() {
  const syncFromServer = useCartStore((s) => s.syncFromServer)
  const loadSettings = useCartStore((s) => s.loadSettings)

  useEffect(() => {
    void loadSettings()
    void syncFromServer()
    // Store actions are stable references, so this runs exactly once.
  }, [loadSettings, syncFromServer])

  return null
}
