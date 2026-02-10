'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Team {
  id: string
  name: string
  color: string
}

interface Player {
  id: string
  name: string
  email: string
  ghinNumber: string
  handicapIndex: number | ''
  teamId: string
}

export default function PlayersSetupPage() {
  const router = useRouter()

  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: '', email: '', ghinNumber: '', handicapIndex: '', teamId: '' })
  const [lookingUpGhin, setLookingUpGhin] = useState(false)

  useEffect(() => {
    const savedTeams = localStorage.getItem('tripTeams')
    if (savedTeams) {
      const parsed = JSON.parse(savedTeams)
      setTeams(parsed)
      if (parsed.length > 0 && !newPlayer.teamId) {
        setNewPlayer(prev => ({ ...prev, teamId: parsed[0].id }))
      }
    }

    const savedPlayers = localStorage.getItem('tripPlayers')
    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers))
    }
  }, [])

  const addPlayer = () => {
    if (!newPlayer.name.trim()) {
      alert('Please enter a player name')
      return
    }

    if (!newPlayer.email.trim()) {
      alert('Please enter an email address')
      return
    }

    const player: Player = {
      id: Date.now().toString(),
      name: newPlayer.name.trim(),
      email: newPlayer.email.trim(),
      ghinNumber: newPlayer.ghinNumber.trim(),
      handicapIndex: newPlayer.handicapIndex ? Number(newPlayer.handicapIndex) : '',
      teamId: newPlayer.teamId,
    }

    setPlayers(prev => [...prev, player])
    setNewPlayer({ name: '', email: '', ghinNumber: '', handicapIndex: '', teamId: newPlayer.teamId })
  }

  // TODO: Integrate with GHIN API when credentials are available
  const lookupGhin = async () => {
    if (!newPlayer.ghinNumber.trim()) return

    setLookingUpGhin(true)
    // Placeholder for GHIN API integration
    console.log('GHIN lookup for:', newPlayer.ghinNumber)

    // Simulate API delay
    setTimeout(() => {
      setLookingUpGhin(false)
      // When implemented, this will fetch handicap from GHIN API and populate the field
    }, 500)
  }

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  const movePlayer = (playerId: string, newTeamId: string) => {
    setPlayers(players.map(p =>
      p.id === playerId ? { ...p, teamId: newTeamId } : p
    ))
  }

  const updatePlayer = (id: string, field: keyof Player, value: string | number) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const getTeamPlayers = (teamId: string) => {
    return players.filter(p => p.teamId === teamId)
  }

  const handleSubmit = () => {
    if (players.length === 0) {
      alert('Please add at least one player')
      return
    }

    const teamCounts = teams.map(t => ({
      team: t.name,
      count: getTeamPlayers(t.id).length
    }))

    const unbalanced = teamCounts.some((tc, idx, arr) =>
      arr.some(other => Math.abs(tc.count - other.count) > 1)
    )

    if (unbalanced) {
      const proceed = confirm('Teams are unbalanced. Continue anyway?')
      if (!proceed) return
    }

    localStorage.setItem('tripPlayers', JSON.stringify(players))
    router.push('/setup/courses')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPlayer()
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push('/setup/teams')}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Teams
          </button>
        </div>

        {/* Add Player Form */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Add Players
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Add players and assign them to teams
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Player Name *</label>
                <Input
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  placeholder="John Smith"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Email *</label>
                <Input
                  type="email"
                  value={newPlayer.email}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, email: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  placeholder="john@email.com"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">GHIN #</label>
                <div className="flex gap-2">
                  <Input
                    value={newPlayer.ghinNumber}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, ghinNumber: e.target.value }))}
                    onKeyPress={handleKeyPress}
                    placeholder="1234567"
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={lookupGhin}
                    disabled={!newPlayer.ghinNumber.trim() || lookingUpGhin}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {lookingUpGhin ? '...' : 'Lookup'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Handicap Index</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newPlayer.handicapIndex}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, handicapIndex: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  placeholder="12.4"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Team</label>
                <select
                  value={newPlayer.teamId}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, teamId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 text-slate-900 dark:text-white text-sm"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                Press Enter to quickly add players
              </p>
              <Button
                onClick={addPlayer}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Add Player
              </Button>
            </div>
          </div>
        </div>

        {/* Teams with players */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {teams.map(team => {
            const teamPlayers = getTeamPlayers(team.id)
            return (
              <div
                key={team.id}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden"
              >
                <div
                  className="p-4 flex items-center justify-between"
                  style={{ backgroundColor: team.color }}
                >
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  <span className="text-sm text-white/80 bg-white/20 px-2 py-0.5 rounded" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                    {teamPlayers.length} players
                  </span>
                </div>
                <div className="p-4">
                  {teamPlayers.length === 0 ? (
                    <p className="text-slate-500 dark:text-gray-400 text-center py-8">
                      No players yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {teamPlayers
                        .sort((a, b) => Number(a.handicapIndex || 99) - Number(b.handicapIndex || 99))
                        .map(player => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 dark:text-white truncate">{player.name}</div>
                              {player.email && (
                                <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{player.email}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {player.ghinNumber && (
                                <span className="text-xs text-slate-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                                  #{player.ghinNumber}
                                </span>
                              )}
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm min-w-[3rem] text-right" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                                {player.handicapIndex !== '' ? player.handicapIndex : '—'}
                              </span>
                              <select
                                value={player.teamId}
                                onChange={(e) => movePlayer(player.id, e.target.value)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-20 h-7 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-gray-300"
                              >
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => removePlayer(player.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Team stats */}
                  {teamPlayers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                      <div className="flex justify-between">
                        <span>Avg handicap:</span>
                        <span className="text-slate-700 dark:text-gray-300">
                          {(teamPlayers.filter(p => p.handicapIndex !== '').reduce((sum, p) => sum + Number(p.handicapIndex), 0) / teamPlayers.filter(p => p.handicapIndex !== '').length || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary and navigation */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              <strong className="text-slate-900 dark:text-white">{players.length}</strong> players total
              {teams.length > 0 && (
                <span className="ml-4">
                  {teams.map(t => `${t.name}: ${getTeamPlayers(t.id).length}`).join(' • ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/setup/teams')}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back
              </Button>
              <button
                onClick={() => router.push('/setup/courses')}
                className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 underline underline-offset-2"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                Skip for now
              </button>
              <Button
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save & Continue →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
