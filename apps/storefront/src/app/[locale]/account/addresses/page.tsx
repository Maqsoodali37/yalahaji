'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
import { fetchAddresses, deleteAddress } from '@/lib/api'

export default function AddressesPage() {
  const queryClient = useQueryClient()

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: fetchAddresses,
  })

  const remove = useMutation({
    mutationFn: deleteAddress,
    // Refetch rather than patching the cache: deleting the default address
    // makes the server promote another one, and only it knows which.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-addresses'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink text-xl">Saved Addresses</h2>
        <button className="btn-primary text-sm py-2 px-4">
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

      {!isLoading && addresses.length === 0 && (
        <div className="bg-white border border-line rounded-md p-12 text-center">
          <MapPin className="w-12 h-12 text-stone mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">No saved addresses</p>
          <p className="text-sm text-stone">Add one to check out faster next time.</p>
        </div>
      )}

      {addresses.map((addr) => (
        <div key={addr.id} className="bg-white border border-line rounded-md p-5 flex gap-4">
          <MapPin className="w-5 h-5 text-green flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-ink">{addr.fullName}</p>
              {addr.isDefault && (
                <span className="text-[10px] bg-green text-white px-1.5 py-0.5 rounded-sm font-bold">Default</span>
              )}
            </div>
            <p className="text-sm text-stone">{addr.phone}</p>
            <p className="text-sm text-stone">{addr.addressLine1}</p>
            <p className="text-sm text-stone">{addr.city}, {addr.province}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-stone hover:text-green transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => remove.mutate(addr.id)}
              disabled={remove.isPending}
              aria-label={`Delete address for ${addr.fullName}`}
              className="p-2 text-stone hover:text-alert transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
