import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './panel'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: 'default' | 'warn' | 'danger' | 'success'
  loading?: boolean
}

const TONES = {
  default: 'bg-green-tint text-green',
  warn: 'bg-gold-tint text-gold-deep',
  danger: 'bg-red-50 text-alert',
  success: 'bg-green-light text-[#137A4C]',
} as const

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading,
}: StatCardProps) {
  return (
    <div className="panel p-4 flex items-start gap-3">
      <div className={cn('h-9 w-9 rounded-md grid place-items-center shrink-0', TONES[tone])}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-3">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-20 mt-1.5" />
        ) : (
          <p className="text-xl font-bold text-ink mt-0.5 tabular-nums truncate">{value}</p>
        )}
        {hint && !loading && <p className="text-[11px] text-ink-3 mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}
