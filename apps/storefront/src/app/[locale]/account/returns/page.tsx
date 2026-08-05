'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, CheckCircle, AlertCircle, Loader2, PackageCheck } from 'lucide-react'
import {
  fetchReturnableOrders,
  fetchMyReturns,
  createReturn,
  ApiError,
  type ReturnStatus,
} from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import {
  validate,
  hasErrors,
  required,
  maxLength,
  type FieldErrors,
} from '@/lib/validation'
import { FormField, inputClass } from '@/components/ui/form-field'

const REASONS = [
  'Wrong item received',
  'Damaged/defective item',
  'Size/fit issue',
  'Changed my mind',
  'Other',
] as const

interface ReturnValues {
  orderId: string
  reason: string
  note: string
}

const returnRules = {
  orderId: [required('Select the order you want to return.')],
  reason: [required('Select a reason for the return.')],
  note: [maxLength(2000)],
}

const STATUS_STYLE: Record<ReturnStatus, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'bg-gold/15 text-gold-deep' },
  approved: { label: 'Approved', className: 'bg-green-tint text-green' },
  rejected: { label: 'Rejected', className: 'bg-alert/10 text-alert' },
  received: { label: 'Received', className: 'bg-green-tint text-green' },
  refunded: { label: 'Refunded', className: 'bg-green text-white' },
}

export default function ReturnsPage() {
  const queryClient = useQueryClient()

  const [values, setValues] = useState<ReturnValues>({ orderId: '', reason: '', note: '' })
  const [errors, setErrors] = useState<FieldErrors<ReturnValues>>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)

  const eligible = useQuery({
    queryKey: ['returnable-orders'],
    queryFn: fetchReturnableOrders,
  })

  const mine = useQuery({
    queryKey: ['my-returns'],
    queryFn: fetchMyReturns,
  })

  const submit = useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      setSuccess(true)
      setValues({ orderId: '', reason: '', note: '' })
      setSubmitted(false)
      // The order leaves the eligible list once a request is open, so both
      // queries have to refetch or the picker keeps offering it.
      queryClient.invalidateQueries({ queryKey: ['returnable-orders'] })
      queryClient.invalidateQueries({ queryKey: ['my-returns'] })
    },
    onError: (e) =>
      setFormError(
        e instanceof ApiError
          ? e.message
          : 'Could not submit your return request. Please try again.',
      ),
  })

  const setField = (field: keyof ReturnValues, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    if (submitted) setErrors(validate(next, returnRules))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')
    setSuccess(false)

    const found = validate(values, returnRules)
    setErrors(found)
    if (hasErrors(found)) return

    submit.mutate({
      orderId: values.orderId,
      reason: values.reason,
      note: values.note.trim() || undefined,
    })
  }

  const orders = eligible.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-ink text-xl mb-3">Request a Return</h2>
        <div className="bg-green-tint border border-green/10 rounded-md p-4 text-sm text-stone">
          Returns accepted within 7 days of delivery. Items must be unused and in original
          packaging.
        </div>
      </div>

      {success && (
        <div className="bg-white border border-green/30 rounded-md p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">Return request submitted</p>
            <p className="text-sm text-stone">
              Our team will review it and contact you within 2 business days.
            </p>
          </div>
        </div>
      )}

      {/* ── Request form ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="bg-white border border-line rounded-md p-6 space-y-4">
        {eligible.isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-28 bg-line rounded-sm" />
            <div className="h-10 w-full bg-line rounded-sm" />
          </div>
        )}

        {eligible.isError && (
          <div className="text-center py-4">
            <AlertCircle className="w-7 h-7 text-alert mx-auto mb-2" />
            <p className="text-sm text-stone mb-3">
              {eligible.error instanceof ApiError
                ? eligible.error.message
                : 'Could not load your orders.'}
            </p>
            <button
              type="button"
              onClick={() => eligible.refetch()}
              className="btn-outline text-sm py-2 px-4"
            >
              Try again
            </button>
          </div>
        )}

        {/* An empty eligible list is the common case, not an error — most
            customers have nothing inside the return window at any moment. */}
        {!eligible.isLoading && !eligible.isError && orders.length === 0 && (
          <div className="text-center py-6">
            <PackageCheck className="w-10 h-10 text-stone mx-auto mb-3" />
            <p className="font-semibold text-ink mb-1">Nothing to return right now</p>
            <p className="text-sm text-stone">
              Only delivered orders from the last 7 days can be returned, and orders with a
              request already in progress aren’t listed.
            </p>
          </div>
        )}

        {!eligible.isLoading && !eligible.isError && orders.length > 0 && (
          <>
            <FormField label="Select Order" required error={errors.orderId}>
              {(props) => (
                <select
                  {...props}
                  value={values.orderId}
                  onChange={(e) => setField('orderId', e.target.value)}
                  className={inputClass(errors.orderId)}
                >
                  <option value="">Select an order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} — {formatPrice(o.total)} (
                      {new Date(o.createdAt).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      )
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Reason for Return" required error={errors.reason}>
              {(props) => (
                <select
                  {...props}
                  value={values.reason}
                  onChange={(e) => setField('reason', e.target.value)}
                  className={inputClass(errors.reason)}
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Additional Details" error={errors.note}>
              {(props) => (
                <textarea
                  {...props}
                  value={values.note}
                  onChange={(e) => setField('note', e.target.value)}
                  className={inputClass(errors.note, 'min-h-[80px] resize-y')}
                  placeholder="Please describe the issue…"
                  maxLength={2000}
                />
              )}
            </FormField>

            {formError && (
              <p
                role="alert"
                className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-sm px-3 py-2"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submit.isPending}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submit.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {submit.isPending ? 'Submitting…' : 'Submit Return Request'}
            </button>
          </>
        )}
      </form>

      {/* ── Existing requests ────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="font-bold text-ink">Your return requests</h3>

        {mine.isLoading && (
          <div className="bg-white border border-line rounded-md p-5 animate-pulse">
            <div className="h-4 w-40 bg-line rounded-sm mb-2" />
            <div className="h-3 w-56 bg-line rounded-sm" />
          </div>
        )}

        {mine.isError && (
          <div className="bg-white border border-alert/30 rounded-md p-5 text-center">
            <p className="text-sm text-stone mb-3">Could not load your return requests.</p>
            <button onClick={() => mine.refetch()} className="btn-outline text-sm py-2 px-4">
              Try again
            </button>
          </div>
        )}

        {!mine.isLoading && !mine.isError && (mine.data ?? []).length === 0 && (
          <div className="bg-white border border-line rounded-md p-8 text-center">
            <p className="text-sm text-stone">You haven’t requested any returns yet.</p>
          </div>
        )}

        {(mine.data ?? []).map((r) => {
          const style = STATUS_STYLE[r.status]
          return (
            <div key={r.id} className="bg-white border border-line rounded-md p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-bold text-ink">{r.order.number}</p>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${style.className}`}
                >
                  {style.label}
                </span>
              </div>
              <p className="text-sm text-stone">{r.reason}</p>
              {r.note && <p className="text-sm text-stone mt-1">{r.note}</p>}
              <p className="text-xs text-stone mt-2">
                Requested{' '}
                {new Date(r.createdAt).toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
