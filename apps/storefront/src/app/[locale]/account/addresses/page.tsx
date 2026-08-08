'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react'
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  ApiError,
  type AddressInput,
} from '@/lib/api'
import { AddressForm } from '@/components/account/address-form'
import { AccountQueryError } from '@/components/account/query-error'
import { formatAddressLines } from '@/lib/address'
import type { Address, AddressDefaultKind } from '@/types'

export default function AddressesPage() {
  const queryClient = useQueryClient()

  // `null` means the dialog is closed; `undefined` inside the open state means
  // "creating". Encoding both in one value keeps the two mutually exclusive —
  // the dialog cannot be open for a create and an edit at the same time.
  const [editing, setEditing] = useState<{ address?: Address } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<Address | null>(null)
  const [actionError, setActionError] = useState('')

  const {
    data: addresses = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: fetchAddresses,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['my-addresses'] })

  const save = useMutation({
    mutationFn: (values: AddressInput) =>
      editing?.address
        ? updateAddress(editing.address.id, values)
        : createAddress(values),
    // Refetch rather than patching the cache: saving an address as the default
    // demotes whichever one held it, and only the server knows which.
    onSuccess: invalidate,
  })

  /**
   * Shipping and billing defaults move independently.
   *
   * The API demotes only the flag being claimed, so setting a default delivery
   * address cannot silently strip the customer's default billing address —
   * a change they never asked for, on a row they were not editing.
   */
  const makeDefault = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: AddressDefaultKind }) =>
      updateAddress(
        id,
        kind === 'shipping' ? { isDefaultShipping: true } : { isDefaultBilling: true },
      ),
    onSuccess: () => {
      setActionError('')
      return invalidate()
    },
    onError: (e) =>
      setActionError(
        e instanceof ApiError ? e.message : 'Could not change your default address.',
      ),
  })

  const remove = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      setConfirmingDelete(null)
      setActionError('')
      return invalidate()
    },
    onError: (e) =>
      setActionError(
        e instanceof ApiError ? e.message : 'Could not delete that address.',
      ),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink text-xl">Saved Addresses</h2>
        <button
          onClick={() => setEditing({})}
          className="btn-primary text-sm py-2 px-4"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>
      </div>

      {isLoading && (
        <div className="bg-white border border-line rounded-md p-5 animate-pulse">
          <div className="h-4 w-40 bg-line rounded-sm mb-2" />
          <div className="h-3 w-56 bg-line rounded-sm" />
        </div>
      )}

      {isError && (
        <AccountQueryError
          error={error}
          onRetry={() => refetch()}
          title="Could not load your addresses"
          what="addresses"
        />
      )}

      {actionError && (
        <p
          role="alert"
          className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-sm px-3 py-2"
        >
          {actionError}
        </p>
      )}

      {/*
        Gated on !isLoading && !isError so a failed fetch never renders as
        "no saved addresses" — telling someone their saved addresses are gone
        when the API simply did not answer is the worst reading of an empty
        array, and the one they will believe.
      */}
      {!isLoading && !isError && addresses.length === 0 && (
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <MapPin className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">No saved addresses</p>
          <p className="text-sm text-stone mb-4">Add one to check out faster next time.</p>
          <button onClick={() => setEditing({})} className="btn-primary text-sm py-2 px-4">
            <Plus className="w-3.5 h-3.5" />
            Add your first address
          </button>
        </div>
      )}

      {addresses.map((addr) => (
        <div key={addr.id} className="bg-white border border-line rounded-md p-5 flex gap-4">
          <MapPin className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-paper border border-line text-stone px-1.5 py-0.5 rounded-sm">
                {addr.label}
              </span>
              <p className="font-bold text-ink">{addr.fullName}</p>
              {addr.isDefaultShipping && (
                <span className="text-[10px] bg-green text-white px-1.5 py-0.5 rounded-sm font-bold">
                  Default delivery
                </span>
              )}
              {addr.isDefaultBilling && (
                <span className="text-[10px] bg-stone/15 text-stone px-1.5 py-0.5 rounded-sm font-bold">
                  Default billing
                </span>
              )}
            </div>
            <p className="text-sm text-stone">{addr.phone}</p>
            {addr.email && <p className="text-sm text-stone">{addr.email}</p>}
            {formatAddressLines(addr).map((line) => (
              <p key={line} className="text-sm text-stone">
                {line}
              </p>
            ))}

            {/*
              Only offered on non-default rows. A "Set as default" control on
              the address that already is one is a dead control — it either
              does nothing or demotes and re-promotes the same row.
            */}
            <div className="flex gap-4 mt-2 flex-wrap">
              {(['shipping', 'billing'] as const).map((kind) => {
                const isSet =
                  kind === 'shipping' ? addr.isDefaultShipping : addr.isDefaultBilling
                // Not offered on the row that already holds it — a control
                // that either does nothing or demotes and re-promotes the same
                // row is a dead control.
                if (isSet) return null

                const pending =
                  makeDefault.isPending &&
                  makeDefault.variables?.id === addr.id &&
                  makeDefault.variables?.kind === kind

                return (
                  <button
                    key={kind}
                    onClick={() => {
                      setActionError('')
                      makeDefault.mutate({ id: addr.id, kind })
                    }}
                    disabled={makeDefault.isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green hover:underline disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Star className="w-3 h-3" />
                    )}
                    Set as default {kind === 'shipping' ? 'delivery' : 'billing'}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing({ address: addr })}
              aria-label={`Edit address for ${addr.fullName}`}
              className="p-2 text-stone hover:text-green transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setActionError('')
                setConfirmingDelete(addr)
              }}
              aria-label={`Delete address for ${addr.fullName}`}
              className="p-2 text-stone hover:text-alert transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {editing && (
        <AddressForm
          initial={editing.address}
          onSubmit={(values) => save.mutateAsync(values).then(() => undefined)}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Deleting an address is not reversible from the UI, so it asks first. */}
      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmingDelete(null)
          }}
        >
          <div className="bg-white border border-line rounded-md p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-ink text-lg">Delete this address?</h3>
            <p className="text-sm text-stone">
              {confirmingDelete.fullName} — {confirmingDelete.addressLine1},{' '}
              {confirmingDelete.city}
            </p>
            {/*
              Stated outright because it is the question people actually have.
              Orders carry their own frozen copy of the address, so deleting
              this row cannot change where a past parcel is recorded as going.
            */}
            <p className="text-xs text-stone">
              Past orders keep the address they were delivered to — this only
              removes it from your address book.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => remove.mutate(confirmingDelete.id)}
                disabled={remove.isPending}
                className="btn-primary flex-1 justify-center py-2.5 bg-alert border-alert hover:bg-alert/90 disabled:opacity-60"
              >
                {remove.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {remove.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmingDelete(null)}
                className="btn-outline px-5 py-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
