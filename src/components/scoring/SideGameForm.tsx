'use client'

import { useState } from 'react'

interface TripPlayer {
  id: string
  user: { name: string }
  team: { name: string; color: string } | null
}

interface Hole {
  id: string
  number: number
  par: number
}

interface SideGameFormProps {
  tripId: string
  roundId: string
  holes: Hole[]
  players: TripPlayer[]
  onSuccess: () => void
  onCancel: () => void
}

export default function SideGameForm({ tripId, roundId, holes, players, onSuccess, onCancel }: SideGameFormProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  const [type, setType] = useState<'CLOSEST_PIN' | 'LONGEST_DRIVE' | 'LONGEST_PUTT'>('CLOSEST_PIN')
  const [holeId, setHoleId] = useState(holes[0]?.id || '')
  const [winnerId, setWinnerId] = useState('')
  const [measurement, setMeasurement] = useState('')
  const [unit, setUnit] = useState<'FEET' | 'YARDS' | 'INCHES'>('FEET')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!holeId) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}/side-games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holeId,
          type,
          winnerId: winnerId || undefined,
          measurement: measurement ? parseFloat(measurement) : undefined,
          unit,
        }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        const json = await res.json()
        setError(json.error?.message || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-4 space-y-3">
      <h4 className="text-white font-medium">Record Side Game</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            style={monoFont}
          >
            <option value="CLOSEST_PIN">Closest to Pin</option>
            <option value="LONGEST_DRIVE">Longest Drive</option>
            <option value="LONGEST_PUTT">Longest Putt</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Hole</label>
          <select
            value={holeId}
            onChange={e => setHoleId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            style={monoFont}
          >
            {holes.map(h => (
              <option key={h.id} value={h.id}>Hole {h.number} (Par {h.par})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Winner</label>
        <select
          value={winnerId}
          onChange={e => setWinnerId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          style={monoFont}
        >
          <option value="">Select player...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.user.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Distance (optional)</label>
          <input
            type="number"
            step="0.1"
            value={measurement}
            onChange={e => setMeasurement(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            style={monoFont}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1" style={monoFont}>Unit</label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as any)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            style={monoFont}
          >
            <option value="FEET">Feet</option>
            <option value="YARDS">Yards</option>
            <option value="INCHES">Inches</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs" style={monoFont}>{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          style={monoFont}
        >
          {saving ? 'Saving...' : 'Record'}
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
