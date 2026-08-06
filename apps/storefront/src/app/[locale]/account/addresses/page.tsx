'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Pencil, Trash2, AlertCircle, Loader2 } from 'lucide-react'
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
import type { Address } from '@/types'

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
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-ink">{addr.fullName}</p>
              {addr.isDefault && (
                <span className="text-[10px] bg-green text-white px-1.5 py-0.5 rounded-sm font-bold">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-stone">{addr.phone}</p>
            <p className="text-sm text-stone">{addr.addressLine1}</p>
            <p className="text-sm text-stone">
              {addr.city}, {addr.province}
              {addr.postalCode ? ` ${addr.postalCode}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
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
