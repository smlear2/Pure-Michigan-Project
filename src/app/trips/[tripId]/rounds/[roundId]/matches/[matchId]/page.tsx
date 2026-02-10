'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Scorecard from '@/components/scoring/Scorecard'
import {
  bestBall,
  holeWinner,
  computeMatchState,
  strokeAllocation,
  HoleResult,
} from '@/lib/golf'
import type { HoleInfo } from '@/lib/golf'

export default function MatchScorecardPage() {
  const params = useParams()
  const router = useRouter()
  const { tripId, roundId, matchId } = params as { tripId: string; roundId: string; matchId: string }

  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}/matches/${matchId}`)
        if (!res.ok) throw new Error('Failed to load match')
        const json = await res.json()
        setMatch(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId, roundId, matchId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>Loading scorecard...</p>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <p className="text-red-400">{error || 'Match not found'}</p>
      </div>
    )
  }

  const holes = match.round.tee.holes.sort((a: any, b: any) => a.number - b.number) as any[]
  const holesForEngine: HoleInfo[] = holes.map((h: any) => ({ number: h.number, par: h.par, handicap: h.handicap }))
  const format = match.round.format
  const effectiveMaxScore = match.round.maxScore ?? match.round.trip.defaultMaxScore
  const showBestBall = format === 'FOURBALL' || format === 'SHAMBLE'

  const side1Players = match.players.filter((p: any) => p.side === 1)
  const side2Players = match.players.filter((p: any) => p.side === 2)

  // Build scorecard sides
  function buildSide(players: any[], color: string, name: string) {
    const sideData = players.map((p: any) => {
      const strokeHoles = strokeAllocation(p.playingHandicap, holesForEngine)
      const scores: (number | null)[] = holes.map(h => {
        const score = p.scores.find((s: any) => s.holeId === h.id)
        return score ? score.grossScore : null
      })
      const netScores: (number | null)[] = holes.map(h => {
        const score = p.scores.find((s: any) => s.holeId === h.id)
        return score ? score.netScore : null
      })
      return {
        id: p.tripPlayer.user.id,
        name: p.tripPlayer.user.name,
        playingHandicap: p.playingHandicap,
        strokeHoles,
        scores,
        netScores,
      }
    })

    // Best ball per hole
    const bestBallScores = showBestBall
      ? holes.map(h => {
          const nets = sideData.map(p => p.netScores[h.number - 1])
          return bestBall(nets)
        })
      : undefined

    return { name, color, players: sideData, bestBall: bestBallScores }
  }

  const side1Team = side1Players[0]?.tripPlayer.team
  const side2Team = side2Players[0]?.tripPlayer.team
  const side1 = buildSide(
    side1Players,
    side1Team?.color ?? '#3b82f6',
    side1Team?.name ?? side1Players.map((p: any) => p.tripPlayer.user.name.split(' ')[0]).join(' / ')
  )
  const side2 = buildSide(
    side2Players,
    side2Team?.color ?? '#ef4444',
    side2Team?.name ?? side2Players.map((p: any) => p.tripPlayer.user.name.split(' ')[0]).join(' / ')
  )

  // Compute match state
  const holeResults: HoleResult[] = holes.map(h => {
    let s1Net: number | null, s2Net: number | null
    if (showBestBall) {
      s1Net = side1.bestBall?.[h.number - 1] ?? null
      s2Net = side2.bestBall?.[h.number - 1] ?? null
    } else {
      // Singles or team formats: first valid net per side
      s1Net = side1.players.map(p => p.netScores[h.number - 1]).find(s => s !== null) ?? null
      s2Net = side2.players.map(p => p.netScores[h.number - 1]).find(s => s !== null) ?? null
    }
    return holeWinner(s1Net, s2Net)
  })

  const matchState = format !== 'STROKEPLAY'
    ? computeMatchState(holeResults, holes.length, match.round.trip.pointsForWin, match.round.trip.pointsForHalf)
    : null

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          <Link href={`/trips/${tripId}`} className="hover:text-slate-300">Trip</Link>
          <span>/</span>
          <Link href={`/trips/${tripId}/rounds/${roundId}`} className="hover:text-slate-300">Round</Link>
          <span>/</span>
          <span className="text-slate-400">Match {match.matchNumber}</span>
        </div>

        {/* Scorecard */}
        <Scorecard
          courseName={match.round.tee.course.name}
          teeName={match.round.tee.name || 'Default'}
          holes={holes}
          side1={side1}
          side2={side2}
          format={format}
          matchState={matchState}
          showBestBall={showBestBall}
        />

        {/* Actions */}
        {match.status !== 'COMPLETE' && (
          <div className="mt-4 text-center">
            <Link
              href={`/trips/${tripId}/rounds/${roundId}/matches/${matchId}/score`}
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Enter Scores
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-center gap-3" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          <Link
            href={`/trips/${tripId}/rounds/${roundId}`}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-colors"
          >
            Back to Round
          </Link>
          <Link
            href={`/trips/${tripId}`}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-colors"
          >
            View Standings
          </Link>
        </div>
      </div>
    </div>
  )
}
