'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Boxes, Check, X, Pencil, AlertTriangle, PackageX } from 'lucide-react'
import { useLowStock, useCatalogueStats, useUpdateVariantStock } from '@/hooks/use-products'
import { RequireRole } from '@/components/layout/auth-gate'
import { Panel, PanelHeader, PageHeader, Badge, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { formatPrice, stockLevel } from '@/lib/utils'

export default function InventoryPage() {
  return (
    <RequireRole>
      <Inventory />
    </RequireRole>
  )
}

function Inventory() {
  const { toast } = useToast()
  const stats = useCatalogueStats()
  const { data, isLoading, isError, error, refetch } = useLowStock(50)
  const updateStock = useUpdateVariantStock()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftStock, setDraftStock] = useState('')

  function startEdit(id: string, current: number) {
    setEditingId(id)
    setDraftStock(String(current))
  }

  async function save(id: string) {
    const stock = Number(draftStock)
    if (!Number.isInteger(stock) || stock < 0) {
      toast('Stock must be a whole number of 0 or more.', 'error')
      return
    }
    try {
      await updateStock.mutateAsync({ id, stock })
      toast('Stock updated.')
      setEditingId(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update stock.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Variants at or below their low-stock threshold."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Products"
          value={stats.data?.productCount ?? 0}
          hint={`${stats.data?.activeCount ?? 0} active`}
          icon={Boxes}
          loading={stats.isLoading}
        />
        <StatCard
          label="Low stock"
          value={stats.data?.lowStockCount ?? 0}
          hint="At or below threshold"
          icon={AlertTriangle}
          tone="warn"
          loading={stats.isLoading}
        />
        <StatCard
          label="Out of stock"
          value={stats.data?.outOfStockCount ?? 0}
          hint="Needs restocking now"
          icon={PackageX}
          tone={(stats.data?.outOfStockCount ?? 0) > 0 ? 'danger' : 'default'}
          loading={stats.isLoading}
        />
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Restock queue"
          description="Sorted by lowest stock first. Edit inline to adjust."
        />

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load inventory.'}
            onRetry={() => void refetch()}
          />
        ) : data && data.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Variant</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Threshold</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((variant) => {
                  const level = stockLevel(variant.stock, variant.lowStockThreshold)
                  const editing = editingId === variant.id

                  return (
                    <tr key={variant.id}>
                      <td>
                        <Link
                          href={`/products/${variant.productId}`}
                          className="font-medium text-ink hover:text-green"
                        >
                          {variant.product.nameEn}
                        </Link>
                      </td>
                      <td className="font-mono text-[11px] text-ink-3">{variant.sku}</td>
                      <td className="text-ink-2">
                        {[variant.tier, variant.size, variant.color, variant.scent]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                      <td className="text-right tabular-nums">{formatPrice(variant.price)}</td>
                      <td className="text-right tabular-nums text-ink-3">
                        {variant.lowStockThreshold}
                      </td>
                      <td className="text-right">
                        {editing ? (
                          <Input
                            type="number"
                            min={0}
                            value={draftStock}
                            onChange={(e) => setDraftStock(e.target.value)}
                            className="h-8 w-24 ml-auto text-right"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void save(variant.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                        ) : (
                          <Badge className={level.cls}>{variant.stock}</Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {editing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void save(variant.id)}
                                disabled={updateStock.isPending}
                                aria-label="Save stock"
                              >
                                <Check className="h-3.5 w-3.5 text-green" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingId(null)}
                                aria-label="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(variant.id, variant.stock)}
                              aria-label="Edit stock"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Boxes className="h-7 w-7" />}
            title="Everything is well stocked"
            description="No variants are at or below their low-stock threshold right now."
          />
        )}
      </Panel>
    </>
  )
}
