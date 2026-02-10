'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PrintableScorecard from '@/components/scoring/PrintableScorecard'
import { strokeAllocation } from '@/lib/golf'
import type { HoleInfo } from '@/lib/golf'

export default function PrintScorecardsPage() {
  const params = useParams()
  const { tripId, roundId } = params as { tripId: string; roundId: string }

  const [round, setRound] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [roundsRes, matchesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/rounds`),
          fetch(`/api/trips/${tripId}/rounds/${roundId}/matches`),
        ])

        if (!roundsRes.ok) throw new Error('Failed to load round data')
        if (!matchesRes.ok) throw new Error('Failed to load matches')

        const roundsJson = await roundsRes.json()
        const matchesJson = await matchesRes.json()

        const thisRound = roundsJson.data.find((r: any) => r.id === roundId)
        if (!thisRound) throw new Error('Round not found')

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

  if (error || !round || matches.length === 0) {
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
  const roundName = round.name || `Round ${round.roundNumber}`
  const format = round.format
  const showBestBall = format === 'FOURBALL' || format === 'SHAMBLE'

  const scorecardData = matches.map((match: any) => {
    const players = match.players.map((p: any) => {
      const strokeHoles = strokeAllocation(p.playingHandicap, holesForEngine)
      return {
        name: p.tripPlayer.user.name,
        teamName: p.tripPlayer.team?.name ?? '',
        teamColor: p.tripPlayer.team?.color ?? '#666',
        side: p.side,
        playingHandicap: p.playingHandicap,
        strokeHoles,
      }
    })

    return {
      matchNumber: match.matchNumber,
      maxScore: round.maxScore,
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
            {roundName} — Scorecards ({matches.length} matches)
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

      {/* Scorecards */}
      {scorecardData.map((card: any) => (
        <PrintableScorecard
          key={card.matchNumber}
          courseName={courseName}
          teeName={teeName}
          teeColor={teeColor}
          roundName={roundName}
          date={round.date}
          format={format}
          matchNumber={card.matchNumber}
          maxScore={card.maxScore}
          holes={card.holes}
          players={card.players}
          showBestBall={showBestBall}
        />
      ))}
    </div>
  )
}
