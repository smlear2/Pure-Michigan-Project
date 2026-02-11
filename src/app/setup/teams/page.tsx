'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const mainColors = [
  { name: 'Blue', color: '#002868' },
  { name: 'Red', color: '#BF0A30' },
  { name: 'Yellow', color: '#FFD700' },
  { name: 'Green', color: '#228B22' },
]

const otherColors = [
  { name: 'Orange', color: '#FF6600' },
  { name: 'Purple', color: '#800080' },
]

const teamPresets = [
  { team1: 'USA', team2: 'Europe', color1: '#BF0A30', color2: '#002868' },
  { team1: 'Shirts', team2: 'Skins' },
  { team1: 'Team A', team2: 'Team B' },
  { team1: 'East', team2: 'West' },
  { team1: 'Old Guys', team2: 'Young Guns' },
]

interface Team {
  id?: string
  name: string
  color: string
}

export default function TeamsSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [teams, setTeams] = useState<Team[]>([
    { name: '', color: mainColors[0].color },
    { name: '', color: mainColors[1].color },
  ])
  const [defendingChampion, setDefendingChampion] = useState<string>('')
  const [showOtherColors, setShowOtherColors] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tripId) {
      router.push('/setup/trip')
      return
    }

    // Load existing teams and trip defending champion
    Promise.all([
      fetch(`/api/trips/${tripId}/teams`).then((r) => r.json()),
      fetch(`/api/trips/${tripId}`).then((r) => r.json()),
    ])
      .then(([teamsRes, tripRes]) => {
        if (teamsRes.data && teamsRes.data.length > 0) {
          setTeams(teamsRes.data)
        }
        if (tripRes.data?.defendingChampionTeamId) {
          setDefendingChampion(tripRes.data.defendingChampionTeamId)
        }
      })
      .catch(() => setError('Failed to load teams'))
      .finally(() => setLoading(false))
  }, [tripId, router])

  const addTeam = () => {
    const allColors = [...mainColors, ...otherColors]
    const colorIndex = teams.length % allColors.length
    setTeams([...teams, { name: '', color: allColors[colorIndex].color }])
  }

  const removeTeam = (idx: number) => {
    if (teams.length > 2) {
      const removed = teams[idx]
      setTeams(teams.filter((_, i) => i !== idx))
      if (removed.id && defendingChampion === removed.id) setDefendingChampion('')
    }
  }

  const updateTeam = (idx: number, field: 'name' | 'color', value: string) => {
    setTeams(teams.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  const applyPreset = (preset: { team1: string; team2: string; color1?: string; color2?: string }) => {
    setTeams((prev) =>
      prev.map((t, idx) => ({
        ...t,
        name: idx === 0 ? preset.team1 : idx === 1 ? preset.team2 : t.name,
        color: idx === 0 && preset.color1 ? preset.color1 : idx === 1 && preset.color2 ? preset.color2 : t.color,
      }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (teams.some((t) => !t.name.trim())) {
      setError('Please enter a name for each team')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        teams: teams.map((t, idx) => ({
          id: t.id || undefined,
          name: t.name.trim(),
          color: t.color,
          sortOrder: idx,
        })),
        defendingChampionTeamId: defendingChampion === 'none' ? null : defendingChampion || null,
      }

      const res = await fetch(`/api/trips/${tripId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Failed to save teams')
        return
      }

      router.push(`/setup/players?tripId=${tripId}`)
    } catch {
      setError('Failed to save teams')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading teams...
        </p>
      </div>
    )
  }

  const bothTeamsNamed = teams.length >= 2 && teams[0].name.trim() && teams[1].name.trim()
  const defendingTeam = teams.find((t) => t.id === defendingChampion)
  const challengingTeam = teams.find((t, idx) => t.id !== defendingChampion && idx < 2)

  return (
    <div className="relative min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Trip
          </button>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1
              className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Setup Teams
            </h1>
            <p
              className="text-slate-600 dark:text-gray-400 text-sm"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              Create your teams. Most trips have 2 teams, but you can add more if needed.
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Quick presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {teamPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-gray-300 hover:border-emerald-500/50 transition-colors"
                  >
                    {preset.team1} vs {preset.team2}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Teams list */}
              <div className="space-y-4">
                {teams.map((team, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30"
                    style={{ borderLeftWidth: '4px', borderLeftColor: team.color }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-900 dark:text-white">Team {idx + 1}</span>
                      {teams.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeTeam(idx)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Team Name</label>
                        <Input
                          value={team.name}
                          onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                          placeholder="e.g., USA, Team Alpha"
                          required
                          className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Team Color</label>
                        <div className="flex flex-wrap gap-1.5">
                          {mainColors.map((preset) => (
                            <button
                              key={preset.color}
                              type="button"
                              className={`w-8 h-8 rounded border-2 transition-colors ${
                                team.color === preset.color
                                  ? 'border-slate-900 dark:border-white'
                                  : 'border-transparent hover:border-slate-400 dark:hover:border-slate-500'
                              }`}
                              style={{ backgroundColor: preset.color }}
                              onClick={() => updateTeam(idx, 'color', preset.color)}
                              title={preset.name}
                            />
                          ))}
                          <button
                            type="button"
                            className={`px-2 h-8 rounded border text-xs font-medium transition-colors ${
                              showOtherColors[idx]
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:border-slate-400'
                            }`}
                            onClick={() => setShowOtherColors((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                          >
                            Other
                          </button>
                          {showOtherColors[idx] &&
                            otherColors.map((preset) => (
                              <button
                                key={preset.color}
                                type="button"
                                className={`w-8 h-8 rounded border-2 transition-colors ${
                                  team.color === preset.color
                                    ? 'border-slate-900 dark:border-white'
                                    : 'border-transparent hover:border-slate-400 dark:hover:border-slate-500'
                                }`}
                                style={{ backgroundColor: preset.color }}
                                onClick={() => updateTeam(idx, 'color', preset.color)}
                                title={preset.name}
                              />
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-2 rounded text-white text-center text-sm font-medium" style={{ backgroundColor: team.color }}>
                      {team.name || `Team ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTeam}
                className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                + Add Another Team
              </button>

              {/* Defending Champion Selector */}
              {bothTeamsNamed && teams[0].id && teams[1].id && (
                <div className="border border-amber-300 dark:border-amber-700/50 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20">
                  <label className="block text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                    Defending Champion
                  </label>
                  <p
                    className="text-xs text-amber-700 dark:text-amber-300/70 mb-4"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                  >
                    Select the defending champion, or choose &quot;No Defender&quot; for first-year events.
                  </p>

                  <div className="flex flex-col gap-3">
                    <label
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                        defendingChampion === 'none'
                          ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-amber-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defendingChampion"
                        value="none"
                        checked={defendingChampion === 'none'}
                        onChange={(e) => setDefendingChampion(e.target.value)}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <span className="font-medium text-slate-900 dark:text-white">No Defending Champion</span>
                      <span className="text-xs text-slate-500 dark:text-gray-400">(First year / standalone)</span>
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {teams.slice(0, 2).map((team) =>
                        team.id ? (
                          <label
                            key={team.id}
                            className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-all ${
                              defendingChampion === team.id
                                ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-amber-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="defendingChampion"
                              value={team.id}
                              checked={defendingChampion === team.id}
                              onChange={(e) => setDefendingChampion(e.target.value)}
                              className="w-4 h-4 accent-amber-600"
                            />
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: team.color }} />
                            <span className="font-medium text-slate-900 dark:text-white">{team.name}</span>
                          </label>
                        ) : null
                      )}
                    </div>
                  </div>

                  {defendingChampion && (
                    <div className="mt-4 p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      {defendingChampion === 'none' ? (
                        <>
                          <p className="text-sm text-slate-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                            Must win by at least <span className="font-bold text-emerald-600 dark:text-emerald-400">0.5 pts</span> to claim victory
                          </p>
                          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                            Ties result in no winner
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                            <span style={{ color: defendingTeam?.color }} className="font-semibold">
                              {defendingTeam?.name}
                            </span>{' '}
                            retains on a tie (needs 50% of points)
                          </p>
                          <p className="text-sm text-slate-700 dark:text-gray-300 mt-1" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                            <span style={{ color: challengingTeam?.color }} className="font-semibold">
                              {challengingTeam?.name}
                            </span>{' '}
                            needs 50% + 0.5 pts to win
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/setup/trip?tripId=${tripId}`)}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ← Back
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? 'Saving...' : 'Save & Continue →'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
