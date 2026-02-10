'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import TeamLeaderboard from '@/components/scoring/TeamLeaderboard'
import PlayerLeaderboard from '@/components/scoring/PlayerLeaderboard'

export default function TripDashboardPage() {
  const params = useParams()
  const { tripId } = params as { tripId: string }

  const [standings, setStandings] = useState<any>(null)
  const [playerStats, setPlayerStats] = useState<any>(null)
  const [rounds, setRounds] = useState<any[]>([])
  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        }
      } catch (err) {
        console.error('Failed to load trip:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId])

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
        {trip && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {trip.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400" style={monoFont}>
              {trip.location && <span>{trip.location}</span>}
              {trip.location && <span>&middot;</span>}
              <span>{trip.year}</span>
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
        <div className="mb-6">
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
