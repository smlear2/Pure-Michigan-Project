'use client'

import { useState } from 'react'

interface TripPlayer {
  id: string
  user: { name: string }
  team: { name: string; color: string } | null
}

interface ExpenseFormProps {
  tripId: string
  players: TripPlayer[]
  onSuccess: () => void
  onCancel: () => void
}

export default function ExpenseForm({ tripId, players, onSuccess, onCancel }: ExpenseFormProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState('')
  const [splitType, setSplitType] = useState<'EVEN_ALL' | 'EVEN_SOME' | 'CUSTOM' | 'FULL_PAYBACK'>('EVEN_ALL')
  const [category, setCategory] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!description || !amount || !paidById) {
      setError('Fill in all required fields')
      return
    }
    setError('')
    setSaving(true)

    const body: Record<string, unknown> = {
      description,
      amount: parseFloat(amount),
      paidById,
      splitType,
      category: category || undefined,
    }

    if (splitType === 'EVEN_SOME') {
      body.splitPlayerIds = selectedPlayers
    } else if (splitType === 'CUSTOM') {
      body.customSplits = Object.entries(customSplits)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([tripPlayerId, amt]) => ({ tripPlayerId, amount: parseFloat(amt) }))
    } else if (splitType === 'FULL_PAYBACK') {
      body.splitPlayerIds = selectedPlayers.slice(0, 1)
    }

    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        onSuccess()
      } else {
        const json = await res.json()
        setError(json.error?.message || 'Failed to create expense')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-4 space-y-3">
      <h4 className="text-white font-medium">Add Expense</h4>

      <input
        type="text"
        placeholder="Description (e.g., Dinner at restaurant)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
        style={monoFont}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          style={monoFont}
          step="0.01"
          min="0"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          style={monoFont}
        />
      </div>

      {/* Paid by */}
      <div>
        <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Paid by</label>
        <select
          value={paidById}
          onChange={e => setPaidById(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          style={monoFont}
        >
          <option value="">Select player...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.user.name}</option>
          ))}
        </select>
      </div>

      {/* Split type */}
      <div>
        <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Split type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['EVEN_ALL', 'EVEN_SOME', 'CUSTOM', 'FULL_PAYBACK'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSplitType(type)}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                splitType === type
                  ? 'border-emerald-500 bg-emerald-900/20 text-emerald-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
              style={monoFont}
            >
              {type === 'EVEN_ALL' && 'Even (All)'}
              {type === 'EVEN_SOME' && 'Even (Some)'}
              {type === 'CUSTOM' && 'Custom'}
              {type === 'FULL_PAYBACK' && 'Full Payback'}
            </button>
          ))}
        </div>
      </div>

      {/* Player selection for EVEN_SOME or FULL_PAYBACK */}
      {(splitType === 'EVEN_SOME' || splitType === 'FULL_PAYBACK') && (
        <div>
          <label className="text-xs text-slate-500 block mb-1" style={monoFont}>
            {splitType === 'FULL_PAYBACK' ? 'Who owes?' : 'Split among'}
          </label>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  if (splitType === 'FULL_PAYBACK') {
                    setSelectedPlayers([p.id])
                  } else {
                    togglePlayer(p.id)
                  }
                }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  selectedPlayers.includes(p.id)
                    ? 'border-emerald-500 bg-emerald-900/20 text-emerald-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
                style={monoFont}
              >
                {p.user.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom splits */}
      {splitType === 'CUSTOM' && (
        <div className="space-y-2">
          <label className="text-xs text-slate-500 block" style={monoFont}>Custom amounts</label>
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-32 truncate">{p.user.name}</span>
              <input
                type="number"
                placeholder="0"
                value={customSplits[p.id] || ''}
                onChange={e => setCustomSplits(prev => ({ ...prev, [p.id]: e.target.value }))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                style={monoFont}
                step="0.01"
                min="0"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs" style={monoFont}>{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          style={monoFont}
        >
          {saving ? 'Saving...' : 'Add Expense'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
          style={monoFont}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
