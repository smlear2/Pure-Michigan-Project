'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatLabels, formatDescriptions, MatchFormat } from '@/types'

interface RoundData {
  id: string
  roundNumber: number
  name: string | null
  date: string | null
  format: MatchFormat
  skinsEnabled: boolean
  teeId: string
  tee: {
    id: string
    name: string
    color: string
    course: { id: string; name: string; location: string | null }
  }
}

interface Course {
  id: string
  name: string
  tees: { id: string; name: string; color: string }[]
}

const formats: MatchFormat[] = ['FOURBALL', 'FOURSOMES', 'MODIFIED_ALT_SHOT', 'SCRAMBLE', 'SHAMBLE', 'SINGLES', 'STROKEPLAY']

interface EditingRound {
  id?: string
  roundNumber: number
  name: string
  date: string
  courseId: string
  teeId: string
  format: MatchFormat
  skinsEnabled: boolean
}

export default function RoundsSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [rounds, setRounds] = useState<RoundData[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [editingRound, setEditingRound] = useState<EditingRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tripId) {
      router.push('/setup/trip')
      return
    }

    Promise.all([
      fetch(`/api/trips/${tripId}/rounds`).then((r) => r.json()),
      fetch(`/api/trips/${tripId}/courses`).then((r) => r.json()),
    ])
      .then(([roundsRes, coursesRes]) => {
        setRounds(roundsRes.data || [])
        setCourses(coursesRes.data || [])
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [tripId, router])

  const addRound = () => {
    const nextNum = rounds.length + 1
    setEditingRound({
      roundNumber: nextNum,
      name: `Round ${nextNum}`,
      date: '',
      courseId: courses[0]?.id || '',
      teeId: courses[0]?.tees[0]?.id || '',
      format: 'FOURBALL',
      skinsEnabled: true,
    })
  }

  const saveRound = async () => {
    if (!editingRound) return
    if (!editingRound.teeId) {
      setError('Please select a course and tee')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingRound.id) {
        // Update existing round
        const res = await fetch(`/api/trips/${tripId}/rounds/${editingRound.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teeId: editingRound.teeId,
            roundNumber: editingRound.roundNumber,
            name: editingRound.name || undefined,
            date: editingRound.date || undefined,
            format: editingRound.format,
            skinsEnabled: editingRound.skinsEnabled,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error?.message || 'Failed to update round')
          return
        }
        setRounds(rounds.map((r) => (r.id === editingRound.id ? json.data : r)))
      } else {
        // Create new round
        const res = await fetch(`/api/trips/${tripId}/rounds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teeId: editingRound.teeId,
            roundNumber: editingRound.roundNumber,
            name: editingRound.name || undefined,
            date: editingRound.date || undefined,
            format: editingRound.format,
            skinsEnabled: editingRound.skinsEnabled,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error?.message || 'Failed to create round')
          return
        }
        setRounds([...rounds, json.data])
      }
      setEditingRound(null)
    } catch {
      setError('Failed to save round')
    } finally {
      setSaving(false)
    }
  }

  const deleteRound = async (roundId: string) => {
    if (!confirm('Delete this round?')) return

    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}`, { method: 'DELETE' })
      if (res.ok) {
        setRounds(rounds.filter((r) => r.id !== roundId))
      }
    } catch {
      setError('Failed to delete round')
    }
  }

  const editRound = (round: RoundData) => {
    setEditingRound({
      id: round.id,
      roundNumber: round.roundNumber,
      name: round.name || '',
      date: round.date ? round.date.split('T')[0] : '',
      courseId: round.tee.course.id,
      teeId: round.teeId,
      format: round.format,
      skinsEnabled: round.skinsEnabled,
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading rounds...
        </p>
      </div>
    )
  }

  // Round Editor
  if (editingRound) {
    const selectedCourse = courses.find((c) => c.id === editingRound.courseId)

    return (
      <div className="relative min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
              <h1
                className="text-2xl font-light text-slate-900 dark:text-white"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {editingRound.id ? 'Edit Round' : 'Add Round'}
              </h1>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Round Name</label>
                  <Input
                    value={editingRound.name}
                    onChange={(e) => setEditingRound({ ...editingRound, name: e.target.value })}
                    placeholder="e.g., Day 1 AM, Finals"
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Date</label>
                  <Input
                    type="date"
                    value={editingRound.date}
                    onChange={(e) => setEditingRound({ ...editingRound, date: e.target.value })}
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Course</label>
                  <select
                    value={editingRound.courseId}
                    onChange={(e) => {
                      const course = courses.find((c) => c.id === e.target.value)
                      setEditingRound({
                        ...editingRound,
                        courseId: e.target.value,
                        teeId: course?.tees[0]?.id || '',
                      })
                    }}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Tees</label>
                  <select
                    value={editingRound.teeId}
                    onChange={(e) => setEditingRound({ ...editingRound, teeId: e.target.value })}
                    disabled={!selectedCourse}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="">Select tees...</option>
                    {selectedCourse?.tees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-gray-400 mb-2">Match Format</label>
                <div className="space-y-2">
                  {formats.map((f) => (
                    <label
                      key={f}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        editingRound.format === f
                          ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={editingRound.format === f}
                        onChange={() => setEditingRound({ ...editingRound, format: f })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{formatLabels[f]}</div>
                        <div className="text-sm text-slate-500 dark:text-gray-400">{formatDescriptions[f]}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="skins"
                  checked={editingRound.skinsEnabled}
                  onChange={(e) => setEditingRound({ ...editingRound, skinsEnabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="skins" className="cursor-pointer">
                  <div className="font-medium text-slate-900 dark:text-white">Enable Skins</div>
                  <div className="text-sm text-slate-500 dark:text-gray-400">Track skins game for this round</div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => { setEditingRound(null); setError('') }}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
                <Button onClick={saveRound} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? 'Saving...' : editingRound.id ? 'Update Round' : 'Add Round'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main rounds list
  return (
    <div className="relative min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Trip
          </button>
        </div>

        {courses.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6">
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              No courses added yet.{' '}
              <button
                onClick={() => router.push(`/setup/courses?tripId=${tripId}`)}
                className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
              >
                Add courses first
              </button>
            </p>
          </div>
        )}

        {/* Rounds header + add button */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden mb-6">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-1"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                Rounds
              </h1>
              <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                Configure each round of your trip
              </p>
            </div>
            <Button onClick={addRound} disabled={courses.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              + Add Round
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Rounds list */}
        {rounds.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-8 text-center mb-6">
            <p className="text-slate-500 dark:text-gray-400 mb-2">No rounds configured yet</p>
            <p className="text-xs text-slate-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Click &quot;+ Add Round&quot; to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {rounds
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map((round) => (
                <div
                  key={round.id}
                  className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 sm:p-5 group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{round.name || `Round ${round.roundNumber}`}</h3>
                        <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400">
                          {formatLabels[round.format]}
                        </Badge>
                        {round.skinsEnabled && (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                            Skins
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                        {round.tee.course.name}
                        <span className="mx-1">&middot;</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ backgroundColor: round.tee.color + '20', color: round.tee.color === '#E5E5E5' ? '#666' : round.tee.color }}
                        >
                          {round.tee.name} tees
                        </span>
                        {round.date && (
                          <>
                            <span className="mx-1">&middot;</span>
                            {new Date(round.date).toLocaleDateString()}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editRound(round)}
                        className="text-sm text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRound(round.id)}
                        className="text-sm text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              <strong className="text-slate-900 dark:text-white">{rounds.length}</strong> round{rounds.length !== 1 ? 's' : ''} configured
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/setup/courses?tripId=${tripId}`)}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back
              </Button>
              <Button
                onClick={() => router.push(`/setup?tripId=${tripId}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Finish Setup →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
