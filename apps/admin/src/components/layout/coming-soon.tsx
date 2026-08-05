import type { LucideIcon } from 'lucide-react'
import { Panel, PageHeader } from '@/components/ui/panel'

interface ComingSoonProps {
  title: string
  description: string
  icon: LucideIcon
  /** What this section will do once built. */
  planned: string[]
  /** API endpoints already available to build against. */
  endpoints?: string[]
}

export function ComingSoon({
  title,
  description,
  icon: Icon,
  planned,
  endpoints,
}: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />

      <Panel className="max-w-2xl">
        <div className="panel-pad">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-md bg-green-tint text-green grid place-items-center">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Not built yet</p>
              <p className="text-xs text-ink-3">This section is next in the queue.</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-ink-2 mb-2">Planned</p>
          <ul className="space-y-1.5 mb-5">
            {planned.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-ink-2">
                <span className="text-ink-3 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>

          {endpoints && endpoints.length > 0 && (
            <>
              <p className="text-xs font-semibold text-ink-2 mb-2">
                API endpoints already available
              </p>
              <ul className="space-y-1">
                {endpoints.map((endpoint) => (
                  <li
                    key={endpoint}
                    className="font-mono text-[11px] text-ink-3 bg-paper rounded px-2 py-1"
                  >
                    {endpoint}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Panel>
    </>
  )
}
