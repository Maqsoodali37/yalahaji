'use client'

import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
import { mockOrders } from '@/data/orders'

const mockAddresses = [mockOrders[0].shippingAddress]

export default function AddressesPage() {
  const [addresses] = useState(mockAddresses)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink text-xl">Saved Addresses</h2>
        <button className="btn-primary text-sm py-2 px-4">
          <Plus className="w-3.5 h-3.5" />
          Add New
        </button>
      </div>
      {addresses.map((addr, i) => (
        <div key={i} className="bg-white border border-line rounded-md p-5 flex gap-4">
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
            <button className="p-2 text-stone hover:text-alert transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
