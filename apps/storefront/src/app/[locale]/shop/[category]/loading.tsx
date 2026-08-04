import {
  Skeleton,
  SectionHeadSkeleton,
  ProductGridSkeleton,
} from '@/components/ui/page-loader'

export default function Loading() {
  return (
    <div className="container-max py-8">
      <Skeleton className="h-3 w-56 mb-6" />
      <Skeleton className="h-[150px] w-full rounded-lg mb-7" />

      <div className="grid lg:grid-cols-[262px_1fr] gap-8 items-start">
        <aside className="hidden lg:block space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2.5 pb-5 border-b border-line">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </aside>

        <div>
          <SectionHeadSkeleton />
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  )
}
