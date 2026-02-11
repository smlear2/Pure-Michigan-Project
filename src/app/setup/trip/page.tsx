'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TripSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [loading, setLoading] = useState(!!tripId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    isTeamEvent: true,
    pointsForWin: 1,
    pointsForHalf: 0.5,
  })

  const [handicapConfig, setHandicapConfig] = useState({
    percentage: 80,
    offTheLow: true,
    maxHandicap: '' as string | number,
    foursomesLow: 60,
    foursomesHigh: 40,
    scrambleLow: 35,
    scrambleHigh: 15,
  })

  // Load existing trip if editing
  useEffect(() => {
    if (!tripId) return
    fetch(`/api/trips/${tripId}`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (data) {
          setFormData({
            name: data.name || '',
            year: data.year || new Date().getFullYear(),
            startDate: data.startDate ? data.startDate.split('T')[0] : '',
            endDate: data.endDate ? data.endDate.split('T')[0] : '',
            location: data.location || '',
            description: data.description || '',
            isTeamEvent: data.isTeamEvent ?? true,
            pointsForWin: data.pointsForWin ?? 1,
            pointsForHalf: data.pointsForHalf ?? 0.5,
          })
          if (data.handicapConfig) {
            const hc = data.handicapConfig
            setHandicapConfig({
              percentage: hc.percentage ?? 80,
              offTheLow: hc.offTheLow ?? true,
              maxHandicap: hc.maxHandicap ?? '',
              foursomesLow: hc.teamCombos?.FOURSOMES?.lowPct ?? 60,
              foursomesHigh: hc.teamCombos?.FOURSOMES?.highPct ?? 40,
              scrambleLow: hc.teamCombos?.SCRAMBLE?.lowPct ?? 35,
              scrambleHigh: hc.teamCombos?.SCRAMBLE?.highPct ?? 15,
            })
          }
        }
      })
      .catch(() => setError('Failed to load trip'))
      .finally(() => setLoading(false))
  }, [tripId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }
      if (name === 'startDate' && value) {
        if (!prev.endDate || prev.endDate < value) {
          updated.endDate = value
        }
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const teamCombos: Record<string, { lowPct: number; highPct: number }> = {}
      if (handicapConfig.foursomesLow || handicapConfig.foursomesHigh) {
        teamCombos.FOURSOMES = { lowPct: Number(handicapConfig.foursomesLow), highPct: Number(handicapConfig.foursomesHigh) }
      }
      if (handicapConfig.scrambleLow || handicapConfig.scrambleHigh) {
        teamCombos.SCRAMBLE = { lowPct: Number(handicapConfig.scrambleLow), highPct: Number(handicapConfig.scrambleHigh) }
      }

      const payload = {
        ...formData,
        year: Number(formData.year),
        pointsForWin: Number(formData.pointsForWin),
        pointsForHalf: Number(formData.pointsForHalf),
        handicapConfig: {
          percentage: Number(handicapConfig.percentage),
          offTheLow: handicapConfig.offTheLow,
          maxHandicap: handicapConfig.maxHandicap !== '' ? Number(handicapConfig.maxHandicap) : null,
          teamCombos: Object.keys(teamCombos).length > 0 ? teamCombos : undefined,
        },
      }

      const url = tripId ? `/api/trips/${tripId}` : '/api/trips'
      const method = tripId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message || 'Failed to save trip')
        return
      }

      const savedTripId = tripId || json.data.id
      router.push(`/setup/teams?tripId=${savedTripId}`)
    } catch {
      setError('Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading trip...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push('/setup')}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Setup
          </button>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1
              className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {tripId ? 'Edit Trip' : 'Create Your Trip'}
            </h1>
            <p
              className="text-slate-600 dark:text-gray-400 text-sm"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              Enter the basic details for your golf trip. You can change these later.
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Trip Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Trip Name *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Michigan Open, Scottsdale Boys Trip, Ryder Cup 2025"
                  required
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Year *
                </label>
                <Input
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  min={2020}
                  max={2100}
                  required
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <Input
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <Input
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    min={formData.startDate || undefined}
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Northern Michigan, Scottsdale AZ"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Optional notes about the trip..."
                />
              </div>

              {/* Competition Type */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                  Competition Type
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label
                    className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                      formData.isTeamEvent
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="isTeamEvent"
                      checked={formData.isTeamEvent === true}
                      onChange={() => setFormData((prev) => ({ ...prev, isTeamEvent: true }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Team Event</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        Players compete in teams (like Ryder Cup)
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                      !formData.isTeamEvent
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="isTeamEvent"
                      checked={formData.isTeamEvent === false}
                      onChange={() => setFormData((prev) => ({ ...prev, isTeamEvent: false }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Individual</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        Every player for themselves
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Points per match (only for team events) */}
              {formData.isTeamEvent && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                    Points Per Match
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Points for Win
                      </label>
                      <Input
                        name="pointsForWin"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.pointsForWin}
                        onChange={handleChange}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Points for Halve
                      </label>
                      <Input
                        name="pointsForHalf"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.pointsForHalf}
                        onChange={handleChange}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Handicap Settings */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                  Handicap Settings
                </label>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                  Configure how handicaps are calculated for matches. Applied as ROUNDUP(course handicap x percentage).
                </p>

                <div className="space-y-4">
                  {/* Percentage + Max */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Handicap %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={handicapConfig.percentage}
                        onChange={(e) => setHandicapConfig((prev) => ({ ...prev, percentage: Number(e.target.value) }))}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Max Handicap
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="No cap"
                        value={handicapConfig.maxHandicap}
                        onChange={(e) => setHandicapConfig((prev) => ({ ...prev, maxHandicap: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Off the Low toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handicapConfig.offTheLow}
                      onChange={(e) => setHandicapConfig((prev) => ({ ...prev, offTheLow: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-gray-300">
                      Play off the low (strokes relative to lowest handicap)
                    </span>
                  </label>

                  {/* Team Format Combos */}
                  {formData.isTeamEvent && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-3">
                        Team Format Combinations
                      </label>

                      {/* Foursomes */}
                      <div className="mb-3">
                        <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                          Foursomes (Alternate Shot)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 dark:text-gray-500 mb-0.5">Low %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={handicapConfig.foursomesLow}
                              onChange={(e) => setHandicapConfig((prev) => ({ ...prev, foursomesLow: Number(e.target.value) }))}
                              className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 dark:text-gray-500 mb-0.5">High %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={handicapConfig.foursomesHigh}
                              onChange={(e) => setHandicapConfig((prev) => ({ ...prev, foursomesHigh: Number(e.target.value) }))}
                              className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Scramble */}
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                          Scramble
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 dark:text-gray-500 mb-0.5">Low %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={handicapConfig.scrambleLow}
                              onChange={(e) => setHandicapConfig((prev) => ({ ...prev, scrambleLow: Number(e.target.value) }))}
                              className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 dark:text-gray-500 mb-0.5">High %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={handicapConfig.scrambleHigh}
                              onChange={(e) => setHandicapConfig((prev) => ({ ...prev, scrambleHigh: Number(e.target.value) }))}
                              className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/setup')}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
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
