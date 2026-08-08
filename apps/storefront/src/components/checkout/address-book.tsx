'use client'

import { useState } from 'react'
import { Check, MapPin, Plus, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAddressInline } from '@/lib/address'
import type { Address } from '@/types'

/**
 * One saved address, as a selectable card.
 *
 * Shared by the inline picker and the Change Address panel so the two cannot
 * disagree about what an address looks like — they are the same list rendered
 * at two sizes, and a customer who picks in one and verifies in the other
 * should be looking at the same thing.
 */
function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: Address
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full text-start p-3 rounded-sm border transition-colors',
        selected
          ? 'border-green bg-green-tint'
          : 'border-line hover:border-green/40 bg-white',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
            selected ? 'border-green bg-green' : 'border-line',
          )}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone">
              {address.label}
            </span>
            {address.isDefaultShipping && (
              <span className="text-[10px] bg-green text-white px-1.5 py-0.5 rounded-sm font-bold">
                Default
              </span>
            )}
          </div>
          <p className="font-semibold text-ink text-sm truncate">{address.fullName}</p>
          <p className="text-xs text-stone">{address.phone}</p>
          <p className="text-xs text-stone">{formatAddressInline(address)}</p>
        </div>
      </div>
    </button>
  )
}

/**
 * The saved-address picker shown above the checkout address form.
 *
 * Signed-in customers only. A guest sees nothing here and gets the blank form
 * underneath, which is the whole of guest checkout's address step — there is
 * no account to read saved addresses from, and rendering an empty picker with
 * a "sign in to see your addresses" prompt turns a working flow into a nag.
 *
 * Switching between addresses is instant because the list is already in hand:
 * it arrives with the checkout page load and is held in a TanStack Query
 * cache, so selecting a different card is a state change, not a fetch.
 */
export function SavedAddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
  onChangeAddress,
  /** True when the chosen address is missing something the courier needs. */
  incomplete,
  onEditIncomplete,
}: {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddNew: () => void
  onChangeAddress: () => void
  incomplete: boolean
  onEditIncomplete: () => void
}) {
  if (addresses.length === 0) {
    return (
      <div className="border border-line rounded-sm p-4 bg-paper">
        <p className="text-sm text-ink font-medium mb-1">No saved addresses yet</p>
        <p className="text-xs text-stone mb-3">
          Fill in the form below — we&apos;ll offer to save it for next time.
        </p>
      </div>
    )
  }

  // Above three, the inline list starts pushing the form off the screen on a
  // phone. Two cards plus "Change" keeps the common case (the default address,
  // already correct) to zero taps and the uncommon one to two.
  const INLINE_LIMIT = 2
  const inline = addresses.slice(0, INLINE_LIMIT)
  const hidden = addresses.length - inline.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-green" />
          Saved Addresses
        </h3>
        <button
          type="button"
          onClick={onChangeAddress}
          className="text-xs font-medium text-green hover:underline"
        >
          Change Address
        </button>
      </div>

      <div className="space-y-2">
        {inline.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            selected={a.id === selectedId}
            onSelect={() => onSelect(a.id)}
          />
        ))}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={onChangeAddress}
          className="text-xs text-stone hover:text-green"
        >
          + {hidden} more saved {hidden === 1 ? 'address' : 'addresses'}
        </button>
      )}

      {/*
        A saved address predating a required field passes the picker and then
        fails at the API, on the review step, after a payment method has been
        chosen. Caught here instead, while the customer is still looking at
        the thing that needs fixing.
      */}
      {incomplete && (
        <div className="flex items-start gap-2 text-sm bg-alert/5 border border-alert/20 rounded-sm px-3 py-2">
          <AlertCircle className="w-4 h-4 text-alert flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-ink">This address is missing something the courier needs.</p>
            <button
              type="button"
              onClick={onEditIncomplete}
              className="text-xs font-medium text-green hover:underline mt-0.5"
            >
              Complete it
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAddNew}
        className="flex items-center gap-1.5 text-sm font-medium text-green hover:underline pt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add a new address
      </button>
    </div>
  )
}

/**
 * Full-list panel behind "Change Address".
 *
 * A modal rather than an expanding section: the address list can be long
 * enough to bury the rest of checkout, and someone opening it has stopped
 * filling the form to go and find a different address.
 */
export function ChangeAddressPanel({
  addresses,
  selectedId,
  onSelect,
  onAddNew,
  onClose,
}: {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddNew: () => void
  onClose: () => void
}) {
  // Staged rather than applied on click, so tapping through the list to read
  // the addresses does not rewrite the form under the customer until they
  // confirm. The default is whatever is already selected, so "Use this
  // address" with no interaction is a no-op rather than a surprise.
  const [staged, setStaged] = useState<string | null>(selectedId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a delivery address"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white border border-line rounded-md w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-bold text-ink text-lg">Choose a delivery address</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-stone hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 space-y-2 overflow-y-auto flex-1">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              selected={a.id === staged}
              onSelect={() => setStaged(a.id)}
            />
          ))}
        </div>

        <div className="p-5 pt-3 space-y-2 border-t border-line mt-3">
          <button
            type="button"
            onClick={onAddNew}
            className="flex items-center gap-1.5 text-sm font-medium text-green hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add a new address
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (staged) onSelect(staged)
                onClose()
              }}
              disabled={!staged}
              className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Use this address
            </button>
            <button type="button" onClick={onClose} className="btn-outline px-5 py-2.5">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
