'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PaymentRecord {
  id: string
  tripPlayerId: string
  amountPaid: number
  status: 'UNPAID' | 'PARTIAL' | 'PAID'
  notes: string | null
  tripPlayer: {
    id: string
    user: { name: string }
    team: { name: string; color: string } | null
  }
}

interface PaymentItem {
  id: string
  name: string
  description: string | null
  amount: number
  dueDate: string | null
  sortOrder: number
  payments: PaymentRecord[]
}

interface PaymentScheduleTableProps {
  items: PaymentItem[]
  tripId: string
  isOrganizer: boolean
  onRefresh: () => void
}

const statusColors = {
  UNPAID: 'bg-red-900/30 text-red-400',
  PARTIAL: 'bg-yellow-900/30 text-yellow-400',
  PAID: 'bg-emerald-900/30 text-emerald-400',
}

const statusIcons = {
  UNPAID: '\u2717',
  PARTIAL: '\u25D0',
  PAID: '\u2713',
}

export default function PaymentScheduleTable({ items, tripId, isOrganizer, onRefresh }: PaymentScheduleTableProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }
  const [showForm, setShowForm] = useState(false)
  const [editingRecords, setEditingRecords] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ name: '', amount: '', description: '' })
  const [saving, setSaving] = useState(false)

  const handleCreateItem = async () => {
    if (!newItem.name || !newItem.amount) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          amount: parseFloat(newItem.amount),
          description: newItem.description || undefined,
          sortOrder: items.length,
        }),
      })
      if (res.ok) {
        setNewItem({ name: '', amount: '', description: '' })
        setShowForm(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this payment item?')) return
    const res = await fetch(`/api/trips/${tripId}/payments/${itemId}`, { method: 'DELETE' })
    if (res.ok) onRefresh()
  }

  const handleUpdateRecord = async (itemId: string, tripPlayerId: string, status: 'UNPAID' | 'PARTIAL' | 'PAID', amount: number) => {
    const res = await fetch(`/api/trips/${tripId}/payments/${itemId}/records`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ tripPlayerId, amountPaid: amount, status }],
      }),
    })
    if (res.ok) onRefresh()
  }

  const cycleStatus = (record: PaymentRecord, itemAmount: number, itemId: string) => {
    const next = record.status === 'UNPAID' ? 'PAID' : record.status === 'PAID' ? 'UNPAID' : 'PAID'
    const amt = next === 'PAID' ? itemAmount : 0
    handleUpdateRecord(itemId, record.tripPlayerId, next, amt)
  }

  if (items.length === 0 && !isOrganizer) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No payment items yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const paidCount = item.payments.filter(p => p.status === 'PAID').length
        const totalPlayers = item.payments.length
        const totalCollected = item.payments.reduce((s, p) => s + p.amountPaid, 0)

        return (
          <div key={item.id} className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
            {/* Item header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">{item.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5" style={monoFont}>
                  <span>{formatCurrency(item.amount)} per player</span>
                  <span>&middot;</span>
                  <span>{paidCount}/{totalPlayers} paid</span>
                  <span>&middot;</span>
                  <span>{formatCurrency(totalCollected)} collected</span>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                )}
              </div>
              {isOrganizer && (
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                  style={monoFont}
                >
                  Delete
                </button>
              )}
            </div>

            {/* Player payment records */}
            <div className="divide-y divide-slate-800/30">
              {item.payments
                .sort((a, b) => a.tripPlayer.user.name.localeCompare(b.tripPlayer.user.name))
                .map(record => (
                  <div key={record.id} className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {record.tripPlayer.team?.color && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: record.tripPlayer.team.color }} />
                      )}
                      <span className="text-sm text-slate-300">{record.tripPlayer.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.status === 'PARTIAL' && (
                        <span className="text-xs text-slate-500" style={monoFont}>
                          {formatCurrency(record.amountPaid)}
                        </span>
                      )}
                      {isOrganizer ? (
                        <button
                          onClick={() => cycleStatus(record, item.amount, item.id)}
                          className={`text-xs px-2 py-0.5 rounded ${statusColors[record.status]} cursor-pointer hover:opacity-80 transition-opacity`}
                          style={monoFont}
                        >
                          {statusIcons[record.status]} {record.status}
                        </button>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${statusColors[record.status]}`}
                          style={monoFont}
                        >
                          {statusIcons[record.status]} {record.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      })}

      {/* Add payment item form */}
      {isOrganizer && (
        <>
          {showForm ? (
            <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-4 space-y-3">
              <input
                type="text"
                placeholder="Payment name (e.g., Trip Entry Fee)"
                value={newItem.name}
                onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                style={monoFont}
              />
              <input
                type="number"
                placeholder="Amount per player"
                value={newItem.amount}
                onChange={e => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                style={monoFont}
                step="0.01"
                min="0"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newItem.description}
                onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                style={monoFont}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateItem}
                  disabled={saving || !newItem.name || !newItem.amount}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  style={monoFont}
                >
                  {saving ? 'Saving...' : 'Add Payment Item'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewItem({ name: '', amount: '', description: '' }) }}
                  className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                  style={monoFont}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-800 transition-colors text-sm"
              style={monoFont}
            >
              + Add Payment Item
            </button>
          )}
        </>
      )}
    </div>
  )
}
