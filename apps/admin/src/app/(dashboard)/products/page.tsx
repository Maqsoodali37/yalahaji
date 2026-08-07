'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Package, Archive, Pencil, ImageOff } from 'lucide-react'
import { useProducts, useArchiveProduct, type ProductFilters } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { RequireRole } from '@/components/layout/auth-gate'
import { Panel, PageHeader, Badge, EmptyState, TableSkeleton, ErrorState } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatPrice, lowestPrice, totalStock, stockLevel, formatDate } from '@/lib/utils'
import type { Product } from '@/types'

const LIMIT = 20

/**
 * The photo the storefront will actually show for this product.
 *
 * Deliberately the primary rather than `images[0]`: the two differ whenever
 * staff promote a photo without reordering the gallery, and a list that
 * disagrees with the shop is worse than a list with no picture at all.
 */
function Thumbnail({ product }: { product: Product }) {
  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0]

  if (!image) {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line bg-paper"
        title="No photo yet"
      >
        <ImageOff className="h-4 w-4 text-ink-3" aria-hidden />
        <span className="sr-only">No photo</span>
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt=""
      className="h-10 w-10 shrink-0 rounded border border-line object-cover"
    />
  )
}

export default function ProductsPage() {
  return (
    <RequireRole>
      <ProductsList />
    </RequireRole>
  )
}

function ProductsList() {
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<ProductFilters['status']>('all')
  const [page, setPage] = useState(1)
  const [archiving, setArchiving] = useState<Product | null>(null)

  const debounced = useDebouncedValue(search)

  // A new search term always starts from the first page.
  useEffect(() => {
    setPage(1)
  }, [debounced])

  const filters: ProductFilters = {
    search: debounced || undefined,
    category: category || undefined,
    status,
    page,
    limit: LIMIT,
  }

  const { data, isLoading, isError, error, refetch } = useProducts(filters)
  const categories = useCategories()
  const archive = useArchiveProduct()

  async function handleArchive() {
    if (!archiving) return
    try {
      await archive.mutateAsync(archiving.id)
      toast(`"${archiving.nameEn}" archived.`)
      setArchiving(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not archive product.', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalogue, pricing and stock."
        action={
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4" />
              New product
            </Button>
          </Link>
        }
      />

      <Panel className="overflow-hidden">
        {/* ─── Filters ───────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by name, SKU or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>

          <Select
            className="w-auto min-w-[160px]"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </Select>

          <Select
            className="w-auto min-w-[130px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ProductFilters['status'])
              setPage(1)
            }}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Archived</option>
          </Select>
        </div>

        {/* ─── Table ─────────────────────────────────────── */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load products.'}
            onRetry={() => void refetch()}
          />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th>Stock</th>
                    <th className="text-right">From</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product) => {
                    const stock = totalStock(product.variants)
                    const threshold = Math.max(
                      ...product.variants.map((v) => v.lowStockThreshold),
                      0,
                    )
                    const level = stockLevel(stock, threshold)

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Thumbnail product={product} />
                            <div className="min-w-0">
                              <Link
                                href={`/products/${product.id}`}
                                className="font-semibold text-ink hover:text-green"
                              >
                                {product.nameEn}
                              </Link>
                              <p className="text-[11px] text-ink-3 font-mono mt-0.5">
                                {product.sku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="text-ink-2">{product.category?.nameEn ?? '—'}</td>
                        <td className="tabular-nums text-ink-2">{product.variants.length}</td>
                        <td>
                          <Badge className={level.cls}>{stock} units</Badge>
                        </td>
                        <td className="text-right font-semibold tabular-nums">
                          {product.variants.length > 0
                            ? formatPrice(lowestPrice(product.variants))
                            : '—'}
                        </td>
                        <td>
                          <Badge
                            className={
                              product.isActive
                                ? 'bg-green-light text-[#137A4C]'
                                : 'bg-paper text-ink-3'
                            }
                          >
                            {product.isActive ? 'Active' : 'Archived'}
                          </Badge>
                        </td>
                        <td className="text-ink-3 text-xs whitespace-nowrap">
                          {formatDate(product.updatedAt)}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/products/${product.id}`}>
                              <Button variant="ghost" size="icon" aria-label="Edit product">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            {product.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Archive product"
                                onClick={() => setArchiving(product)}
                              >
                                <Archive className="h-3.5 w-3.5" />
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

            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={data.meta.limit}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title={debounced || category ? 'No matching products' : 'No products yet'}
            description={
              debounced || category
                ? 'Try adjusting your search or filters.'
                : 'Add your first product to start selling.'
            }
            action={
              !debounced && !category ? (
                <Link href="/products/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    New product
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </Panel>

      <ConfirmDialog
        open={!!archiving}
        title="Archive this product?"
        description={`"${archiving?.nameEn}" will be hidden from the storefront. You can reactivate it later by editing the product.`}
        confirmLabel="Archive"
        destructive
        loading={archive.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />
    </>
  )
}
