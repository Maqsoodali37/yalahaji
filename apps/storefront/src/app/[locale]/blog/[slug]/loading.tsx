import { Skeleton } from '@/components/ui/page-loader'

export default function Loading() {
  return (
    <article className="container-max py-8 max-w-3xl">
      <Skeleton className="h-3 w-48 mb-6" />
      <Skeleton className="h-4 w-28 rounded-sm mb-4" />
      <Skeleton className="h-11 w-full mb-2" />
      <Skeleton className="h-11 w-3/4 mb-5" />
      <Skeleton className="h-3 w-56 mb-8" />
      <Skeleton className="aspect-video w-full rounded-md mb-8" />

      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3.5 ${i % 4 === 3 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    </article>
  )
}
