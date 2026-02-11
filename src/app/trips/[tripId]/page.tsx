'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TeamLeaderboard from '@/components/scoring/TeamLeaderboard'
import PlayerLeaderboard from '@/components/scoring/PlayerLeaderboard'
import { createClient } from '@/lib/supabase/client'

export default function TripDashboardPage() {
  const params = useParams()
  const { tripId } = params as { tripId: string }

  const [standings, setStandings] = useState<any>(null)
  const [playerStats, setPlayerStats] = useState<any>(null)
  const [rounds, setRounds] = useState<any[]>([])
  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editYear, setEditYear] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [standingsRes, playerStatsRes, roundsRes, tripRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/standings`),
          fetch(`/api/trips/${tripId}/player-stats`),
          fetch(`/api/trips/${tripId}/rounds`),
          fetch(`/api/trips/${tripId}`),
        ])

        if (standingsRes.ok) {
          const json = await standingsRes.json()
          setStandings(json.data)
        }

        if (playerStatsRes.ok) {
          const json = await playerStatsRes.json()
          setPlayerStats(json.data)
        }

        if (roundsRes.ok) {
          const json = await roundsRes.json()
          setRounds(json.data)
        }

        if (tripRes.ok) {
          const json = await tripRes.json()
          setTrip(json.data)

          // Check if current user is an organizer
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user && json.data?.tripPlayers) {
            const me = json.data.tripPlayers.find(
              (tp: any) => tp.user?.email === user.email
            )
            if (me?.role === 'ORGANIZER') setIsOrganizer(true)
          }
        }
      } catch (err) {
        console.error('Failed to load trip:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId])

  function startEditing() {
    setEditName(trip.name || '')
    setEditLocation(trip.location || '')
    setEditYear(trip.year || new Date().getFullYear())
    setEditing(true)
  }

  async function saveTrip() {
    setSaving(true)
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, location: editLocation, year: editYear }),
      })
      if (res.ok) {
        const json = await res.json()
        setTrip({ ...trip, name: json.data.name, location: json.data.location, year: json.data.year })
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={monoFont}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Trip header */}
        {trip && !editing && (
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                {trip.name}
              </h1>
              {isOrganizer && (
                <button
                  onClick={startEditing}
                  className="text-slate-600 hover:text-slate-400 transition-colors p-1"
                  title="Edit trip details"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400" style={monoFont}>
              {trip.location && <span>{trip.location}</span>}
              {trip.location && <span>&middot;</span>}
              <span>{trip.year}</span>
            </div>
          </div>
        )}
        {trip && editing && (
          <div className="mb-6 bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1" style={monoFont}>Trip Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1" style={monoFont}>Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-slate-500 mb-1" style={monoFont}>Year</label>
                <input
                  type="number"
                  value={editYear}
                  onChange={e => setEditYear(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveTrip}
                disabled={saving || !editName.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Team Leaderboard */}
        {standings && (
          <div className="mb-6">
            <TeamLeaderboard
              standings={standings.standings}
              pointsToWin={standings.pointsToWin}
              totalMatchesPlayed={standings.totalMatchesPlayed}
            />
          </div>
        )}

        {/* Player Leaderboard */}
        {playerStats && playerStats.players && (
          <div className="mb-6">
            <PlayerLeaderboard players={playerStats.players} />
          </div>
        )}

        {/* Quick links */}
        <div className="mb-6 space-y-2">
          <Link
            href={`/trips/${tripId}/finances`}
            className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-emerald-800 transition-colors px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Finances</p>
                <p className="text-xs text-slate-500 mt-0.5" style={monoFont}>
                  Payments, expenses, gambling ledger & settlement
                </p>
              </div>
              <span className="text-slate-600 text-sm">&rarr;</span>
            </div>
          </Link>
          {isOrganizer && (
            <>
              <Link
                href={`/setup/players?tripId=${tripId}`}
                className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-emerald-800 transition-colors px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Manage Players</p>
                    <p className="text-xs text-slate-500 mt-0.5" style={monoFont}>
                      Add or remove players, send invitations
                    </p>
                  </div>
                  <span className="text-slate-600 text-sm">&rarr;</span>
                </div>
              </Link>
              <Link
                href={`/setup/teams?tripId=${tripId}`}
                className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-emerald-800 transition-colors px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Manage Teams</p>
                    <p className="text-xs text-slate-500 mt-0.5" style={monoFont}>
                      Create teams, assign colors, set defending champion
                    </p>
                  </div>
                  <span className="text-slate-600 text-sm">&rarr;</span>
                </div>
              </Link>
              <Link
                href={`/setup/courses?tripId=${tripId}`}
                className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-emerald-800 transition-colors px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Manage Courses</p>
                    <p className="text-xs text-slate-500 mt-0.5" style={monoFont}>
                      Add courses and tee boxes
                    </p>
                  </div>
                  <span className="text-slate-600 text-sm">&rarr;</span>
                </div>
              </Link>
              <Link
                href={`/setup/rounds?tripId=${tripId}`}
                className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-emerald-800 transition-colors px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Manage Rounds</p>
                    <p className="text-xs text-slate-500 mt-0.5" style={monoFont}>
                      Set up rounds, formats, and matchups
                    </p>
                  </div>
                  <span className="text-slate-600 text-sm">&rarr;</span>
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Rounds list */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            Rounds
          </h2>
          <div className="space-y-2">
            {rounds.length === 0 ? (
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-6 text-center">
                <p className="text-slate-500" style={monoFont}>No rounds set up yet</p>
              </div>
            ) : (
              rounds.map((round: any) => (
                <Link
                  key={round.id}
                  href={`/trips/${tripId}/rounds/${round.id}`}
                  className="block bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 hover:border-slate-700 transition-colors px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">
                        {round.name || `Round ${round.roundNumber}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500" style={monoFont}>
                        {round.tee?.course && <span>{round.tee.course.name}</span>}
                        <span>&middot;</span>
                        <span>{round.format.replace(/_/g, ' ')}</span>
                        {round.date && (
                          <>
                            <span>&middot;</span>
                            <span>{new Date(round.date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {round.isComplete && (
                        <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded" style={monoFont}>
                          Complete
                        </span>
                      )}
                      {round.verificationStatus === 'VERIFIED' && (
                        <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded" style={monoFont}>
                          Verified
                        </span>
                      )}
                      <span className="text-slate-600 text-sm">→</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
