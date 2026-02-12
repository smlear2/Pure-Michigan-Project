'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PrintableScorecard from '@/components/scoring/PrintableScorecard'
import { strokeAllocation } from '@/lib/golf'
import type { HoleInfo } from '@/lib/golf'

const LOCAL_RULES = `- Two off of the First Tee as is customary
- "Winter Rules" in Fairway (clean off mud ball, etc. - no penalty)
- Play all Lost Balls as Lateral:
    - Red or Yellow Stakes = 1 stroke penalty
       - Relief = nearest point of entry no closer to hole
    - OB = 2 stroke penalty (Stroke & Distance)
       - Relief = anywhere between entry point and nearest edge of fairway, no closer to hole`

export default function PrintScorecardsPage() {
  const params = useParams()
  const { tripId, roundId } = params as { tripId: string; roundId: string }

  const [round, setRound] = useState<any>(null)
  const [trip, setTrip] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [tripRes, roundsRes, matchesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          fetch(`/api/trips/${tripId}/rounds`),
          fetch(`/api/trips/${tripId}/rounds/${roundId}/matches`),
        ])

        if (!tripRes.ok) throw new Error('Failed to load trip data')
        if (!roundsRes.ok) throw new Error('Failed to load round data')
        if (!matchesRes.ok) throw new Error('Failed to load matches')

        const tripJson = await tripRes.json()
        const roundsJson = await roundsRes.json()
        const matchesJson = await matchesRes.json()

        const thisRound = roundsJson.data.find((r: any) => r.id === roundId)
        if (!thisRound) throw new Error('Round not found')

        setTrip(tripJson.data)
        setRound(thisRound)
        setMatches(matchesJson.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId, roundId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading scorecards...
        </p>
      </div>
    )
  }

  if (error || !round || !trip || matches.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <p className="text-red-400">{error || 'No matches found for this round'}</p>
      </div>
    )
  }

  const holes = round.tee.holes.sort((a: any, b: any) => a.number - b.number)
  const holesForEngine: HoleInfo[] = holes.map((h: any) => ({
    number: h.number,
    par: h.par,
    handicap: h.handicap,
  }))

  const courseName = round.tee.course.name
  const teeName = round.tee.name || 'Default'
  const teeColor = round.tee.color || '#666'
  const teeRating = round.tee.rating ?? 0
  const teeSlope = round.tee.slope ?? 0
  const roundName = round.name || `Round ${round.roundNumber}`
  const format = round.format
  const showBestBall = format === 'FOURBALL' || format === 'SHAMBLE'
  const isTeamFormat = format === 'FOURSOMES' || format === 'SCRAMBLE'

  const scorecardData = matches.map((match: any) => {
    const allPlayers = match.players.map((p: any) => ({
      name: p.tripPlayer.user.name,
      teamName: p.tripPlayer.team?.name ?? '',
      teamColor: p.tripPlayer.team?.color ?? '#666',
      side: p.side,
      courseHandicap: p.courseHandicap,
      playingHandicap: p.playingHandicap,
      handicapIndex: p.tripPlayer.handicapAtTime ?? 0,
    }))

    // Compute stroke allocation for display
    // Individual formats: use courseHandicap off-the-low (full strokes, no %)
    // Team formats: use playingHandicap (already has combo + off-the-low)
    const minCourseHcp = Math.min(...allPlayers.map((p: any) => p.courseHandicap))

    const players = allPlayers.map((p: any, idx: number) => {
      let displayStrokes: number
      if (isTeamFormat) {
        displayStrokes = p.playingHandicap
      } else {
        displayStrokes = Math.max(0, p.courseHandicap - minCourseHcp)
      }

      // For team formats, only show strokes on first player per side
      const sameSideBefore = allPlayers.slice(0, idx).filter((op: any) => op.side === p.side)
      const isFirstOnSide = sameSideBefore.length === 0
      const showStrokes = !isTeamFormat || isFirstOnSide

      const strokeHoles = showStrokes && displayStrokes > 0
        ? strokeAllocation(displayStrokes, holesForEngine)
        : []

      return { ...p, strokeHoles }
    })

    return {
      matchNumber: match.matchNumber,
      holes: holes.map((h: any) => ({
        number: h.number,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap,
      })),
      players,
    }
  })

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      {/* Controls — hidden when printing */}
      <div className="no-print" style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={`/trips/${tripId}/rounds/${roundId}`}
            style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'none' }}
          >
            &larr; Back to Round
          </Link>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
            {roundName} — Scorecards ({matches.length} matches, {matches.length * 2} pages)
          </span>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: '#059669',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Print All Scorecards
        </button>
      </div>

      {/* Scorecards — two copies per match (one for each side) */}
      {scorecardData.flatMap((card: any) => [1, 2].map(copy => (
        <PrintableScorecard
          key={`${card.matchNumber}-${copy}`}
          tournamentName={trip.name || 'Michigan Open'}
          year={trip.year}
          courseName={courseName}
          teeName={teeName}
          teeColor={teeColor}
          teeRating={teeRating}
          teeSlope={teeSlope}
          roundName={roundName}
          roundNumber={round.roundNumber}
          date={round.date}
          format={format}
          matchNumber={card.matchNumber}
          holes={card.holes}
          players={card.players}
          showBestBall={showBestBall}
          localRules={LOCAL_RULES}
        />
      )))}
    </div>
  )
}
