import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────
   Branded spinner — the Yala Haji mark inside a rotating ring
   ───────────────────────────────────────────────────────────── */

interface SpinnerProps {
  /** Diameter in px. Default 64. */
  size?: number
  className?: string
}

export function BrandSpinner({ size = 64, className }: SpinnerProps) {
  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {/* Static track */}
      <div className="absolute inset-0 rounded-full border-[3px] border-line" />
      {/* Spinning arc */}
      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold border-r-gold animate-spin" />
      {/* Logo mark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/placeholder.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 m-auto object-contain animate-pulse"
        style={{ width: size * 0.58, height: size * 0.58 }}
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Full-page loader — used by route-level loading.tsx files
   ───────────────────────────────────────────────────────────── */

interface PageLoaderProps {
  /** Optional message under the spinner. */
  label?: string
  /** Vertical padding preset. */
  minHeight?: string
}

export function PageLoader({
  label = 'Loading…',
  minHeight = '60vh',
}: PageLoaderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 w-full"
      style={{ minHeight }}
    >
      <BrandSpinner size={72} />
      <p className="text-sm font-semibold text-stone tracking-wide">{label}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Skeleton primitives — for content-shaped loading states
   ───────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-green-tint/70', className)}
      aria-hidden="true"
    />
  )
}

/** Product card placeholder matching the real card's proportions. */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-line rounded-md overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-9 rounded-sm" />
        </div>
      </div>
    </div>
  )
}

/** Grid of product skeletons. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Section heading placeholder. */
export function SectionHeadSkeleton() {
  return (
    <div className="flex items-end justify-between mb-[30px] gap-5">
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-8 w-72" />
      </div>
      <Skeleton className="hidden md:block h-10 w-32 rounded-lg" />
    </div>
  )
}
