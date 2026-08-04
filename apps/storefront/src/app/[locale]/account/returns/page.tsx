'use client'

import { useState } from 'react'
import { RotateCcw, CheckCircle } from 'lucide-react'
import { mockOrders } from '@/data/orders'
import { formatPrice } from '@/lib/utils'

export default function ReturnsPage() {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')

  const deliveredOrders = mockOrders.filter((o) => o.status === 'delivered')

  if (step === 'success') {
    return (
      <div className="bg-white border border-line rounded-md p-12 text-center">
        <CheckCircle className="w-12 h-12 text-green mx-auto mb-4" />
        <h3 className="font-bold text-ink text-xl mb-2">Return Request Submitted</h3>
        <p className="text-sm text-stone">Our team will review and contact you within 2 business days.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-ink text-xl">Request a Return</h2>
      <div className="bg-green-tint border border-green/10 rounded-md p-4 text-sm text-stone">
        Returns accepted within 7 days of delivery. Items must be unused and in original packaging.
      </div>

      <div className="bg-white border border-line rounded-md p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Select Order *</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="input-base">
            <option value="">Select an order</option>
            {deliveredOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {formatPrice(o.total)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Reason for Return *</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-base">
            <option value="">Select a reason</option>
            <option>Wrong item received</option>
            <option>Damaged/defective item</option>
            <option>Size/fit issue</option>
            <option>Changed my mind</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone uppercase tracking-wider mb-1 block">Additional Details</label>
          <textarea
            className="input-base min-h-[80px] resize-none"
            placeholder="Please describe the issue..."
          />
        </div>

        <button
          onClick={() => orderId && reason && setStep('success')}
          disabled={!orderId || !reason}
          className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Submit Return Request
        </button>
      </div>
    </div>
  )
}
