'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Team {
  id: string
  name: string
  color: string
}

interface TripPlayer {
  id: string
  teamId: string | null
  handicapAtTime: number
  role: 'ORGANIZER' | 'PLAYER'
  isPending?: boolean
  user: {
    id: string
    name: string
    email: string
    handicapIndex: number | null
    ghinNumber: string | null
  }
  team: { id: string; name: string; color: string } | null
}

export default function PlayersSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<TripPlayer[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', ghinNumber: '', handicapIndex: '', teamId: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) {
      router.push('/setup/trip')
      return
    }

    Promise.all([
      fetch(`/api/trips/${tripId}/teams`).then((r) => r.json()),
      fetch(`/api/trips/${tripId}/players`).then((r) => r.json()),
    ])
      .then(([teamsRes, playersRes]) => {
        const loadedTeams = teamsRes.data || []
        setTeams(loadedTeams)
        setPlayers(playersRes.data || [])
        if (loadedTeams.length > 0 && !newPlayer.teamId) {
          setNewPlayer((prev) => ({ ...prev, teamId: loadedTeams[0].id }))
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [tripId, router])

  const addPlayer = async () => {
    if (!newPlayer.name.trim()) {
      setError('Please enter a player name')
      return
    }
    if (!newPlayer.email.trim()) {
      setError('Please enter an email address')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/trips/${tripId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayer.name.trim(),
          email: newPlayer.email.trim(),
          ghinNumber: newPlayer.ghinNumber.trim() || undefined,
          handicapIndex: newPlayer.handicapIndex ? Number(newPlayer.handicapIndex) : undefined,
          teamId: newPlayer.teamId || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to add player')
        return
      }

      setPlayers((prev) => [...prev, json.data])
      setNewPlayer({ name: '', email: '', ghinNumber: '', handicapIndex: '', teamId: newPlayer.teamId })
    } catch {
      setError('Failed to add player')
    } finally {
      setSaving(false)
    }
  }

  const removePlayer = async (playerId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/players/${playerId}`, { method: 'DELETE' })
      if (res.ok) {
        setPlayers(players.filter((p) => p.id !== playerId))
      }
    } catch {
      setError('Failed to remove player')
    }
  }

  const movePlayer = async (playerId: string, newTeamId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: newTeamId || null }),
      })

      if (res.ok) {
        const json = await res.json()
        setPlayers(players.map((p) => (p.id === playerId ? json.data : p)))
      }
    } catch {
      setError('Failed to move player')
    }
  }

  const toggleRole = async (playerId: string, currentRole: string) => {
    const newRole = currentRole === 'ORGANIZER' ? 'PLAYER' : 'ORGANIZER'
    try {
      const res = await fetch(`/api/trips/${tripId}/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        const json = await res.json()
        setPlayers(players.map((p) => (p.id === playerId ? { ...p, role: newRole as 'ORGANIZER' | 'PLAYER' } : p)))
      }
    } catch {
      setError('Failed to update role')
    }
  }

  const resendInvite = async (playerId: string) => {
    setResending(playerId)
    setResendSuccess(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/players/${playerId}/invite`, { method: 'POST' })
      if (res.ok) {
        setResendSuccess(playerId)
        setTimeout(() => setResendSuccess(null), 3000)
      } else {
        setError('Failed to resend invitation')
      }
    } catch {
      setError('Failed to resend invitation')
    } finally {
      setResending(null)
    }
  }

  const getTeamPlayers = (teamId: string) => players.filter((p) => p.teamId === teamId)

  const renderPlayerRow = (player: TripPlayer) => (
    <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white truncate">{player.user.name}</span>
          {player.isPending && (
            <span className="text-xs bg-sky-900/30 text-sky-400 px-1.5 py-0.5 rounded shrink-0" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Invited
            </span>
          )}
          {player.role === 'ORGANIZER' && (
            <span className="text-xs bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded shrink-0" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Org
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{player.user.email}</div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        {player.isPending && (
          <button
            onClick={() => resendInvite(player.id)}
            disabled={resending === player.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-sky-500 hover:text-sky-400 px-1 disabled:opacity-50"
            title="Resend invitation email"
          >
            {resending === player.id ? '...' : resendSuccess === player.id ? 'Sent!' : 'Resend'}
          </button>
        )}
        <button
          onClick={() => toggleRole(player.id, player.role)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500 hover:text-amber-400 px-1"
          title={player.role === 'ORGANIZER' ? 'Remove organizer role' : 'Make organizer'}
        >
          {player.role === 'ORGANIZER' ? '\u2212org' : '+org'}
        </button>
        {player.user.ghinNumber && (
          <span className="text-xs text-slate-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            #{player.user.ghinNumber}
          </span>
        )}
        <span
          className="text-emerald-600 dark:text-emerald-400 font-medium text-sm min-w-[3rem] text-right"
          style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
        >
          {player.handicapAtTime || '\u2014'}
        </span>
        {teams.length > 0 && (
          <select
            value={player.teamId || ''}
            onChange={(e) => movePlayer(player.id, e.target.value)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-20 h-7 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-gray-300"
          >
            <option value="">None</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => removePlayer(player.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
        >
          x
        </button>
      </div>
    </div>
  )

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPlayer()
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading players...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/setup/teams?tripId=${tripId}`)}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Teams
          </button>
        </div>

        {/* Add Player Form */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1
              className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Add Players
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Add players by name and email — they'll receive an invitation to join
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Name</label>
                <Input
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer((prev) => ({ ...prev, name: e.target.value }))}
                  onKeyDown={handleKeyPress}
                  placeholder="John Smith"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Email</label>
                <Input
                  type="email"
                  value={newPlayer.email}
                  onChange={(e) => setNewPlayer((prev) => ({ ...prev, email: e.target.value }))}
                  onKeyDown={handleKeyPress}
                  placeholder="john@email.com"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <Button onClick={addPlayer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                {saving ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </div>

        {/* Players list */}
        {players.filter((p) => !p.teamId).length > 0 && (
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden mb-6">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {teams.length > 0 ? 'Unassigned' : 'Players'}
              </h3>
              <span
                className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {players.filter((p) => !p.teamId).length} players
              </span>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {players
                  .filter((p) => !p.teamId)
                  .sort((a, b) => (a.handicapAtTime || 99) - (b.handicapAtTime || 99))
                  .map((player) => renderPlayerRow(player))}
              </div>
            </div>
          </div>
        )}

        {/* Teams with players */}
        {teams.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {teams.map((team) => {
            const teamPlayers = getTeamPlayers(team.id)
            return (
              <div
                key={team.id}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between" style={{ backgroundColor: team.color }}>
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  <span
                    className="text-sm text-white/80 bg-white/20 px-2 py-0.5 rounded"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                  >
                    {teamPlayers.length} players
                  </span>
                </div>
                <div className="p-4">
                  {teamPlayers.length === 0 ? (
                    <p className="text-slate-500 dark:text-gray-400 text-center py-8">No players yet</p>
                  ) : (
                    <div className="space-y-2">
                      {teamPlayers
                        .sort((a, b) => (a.handicapAtTime || 99) - (b.handicapAtTime || 99))
                        .map((player) => renderPlayerRow(player))}
                    </div>
                  )}

                  {teamPlayers.length > 0 && (
                    <div
                      className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-gray-400"
                      style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                    >
                      <div className="flex justify-between">
                        <span>Avg handicap:</span>
                        <span className="text-slate-700 dark:text-gray-300">
                          {(teamPlayers.reduce((sum, p) => sum + (p.handicapAtTime || 0), 0) / teamPlayers.length).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}

        {/* Summary and navigation */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              <strong className="text-slate-900 dark:text-white">{players.length}</strong> players total
              {teams.length > 0 && (
                <span className="ml-4">
                  {teams.map((t) => `${t.name}: ${getTeamPlayers(t.id).length}`).join(' · ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/setup/teams?tripId=${tripId}`)}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back
              </Button>
              <button
                onClick={() => router.push(`/setup/courses?tripId=${tripId}`)}
                className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 underline underline-offset-2"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                Skip for now
              </button>
              <Button
                onClick={() => router.push(`/setup/courses?tripId=${tripId}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Continue →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
