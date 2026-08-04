import { Skeleton, SectionHeadSkeleton } from '@/components/ui/page-loader'

export default function Loading() {
  return (
    <div className="container-max py-8">
      <SectionHeadSkeleton />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-line rounded-md overflow-hidden">
            <Skeleton className="aspect-video rounded-none" />
            <div className="p-5 space-y-2.5">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-full mt-3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
