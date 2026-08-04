import { Skeleton, ProductGridSkeleton } from '@/components/ui/page-loader'

export default function Loading() {
  return (
    <div className="container-max py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-3 w-64 mb-6" />

      <div className="grid lg:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-md" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-sm" />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-48" />

          <div className="pt-4 space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-24 rounded-sm" />
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-sm" />
            <Skeleton className="h-12 w-12 rounded-sm" />
          </div>

          <div className="pt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>

      {/* Related products */}
      <Skeleton className="h-7 w-56 mb-6" />
      <ProductGridSkeleton count={4} />
    </div>
  )
}
