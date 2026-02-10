'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import HoleNavStrip from '@/components/scoring/HoleNavStrip'
import ScoreInput from '@/components/scoring/ScoreInput'
import MatchStatusBar from '@/components/scoring/MatchStatusBar'
import {
  bestBall,
  holeWinner,
  computeMatchState,
  receivesStroke,
  applyMaxScore,
  netScore,
  HoleResult,
  MatchState,
} from '@/lib/golf'

interface HoleData {
  id: string
  number: number
  par: number
  yardage: number
  handicap: number
}

interface MatchPlayerData {
  id: string
  side: number
  courseHandicap: number
  playingHandicap: number
  tripPlayer: {
    id: string
    user: { id: string; name: string; avatarUrl: string | null }
    team: { id: string; name: string; color: string } | null
  }
  scores: {
    id: string
    holeId: string
    grossScore: number
    netScore: number
    strokeReceived: boolean
    hole: HoleData
  }[]
}

interface MatchData {
  id: string
  matchNumber: number
  status: string
  resultText: string | null
  side1Points: number
  side2Points: number
  round: {
    id: string
    format: string
    maxScore: number | null
    verificationStatus: string
    tee: {
      course: { id: string; name: string }
      holes: HoleData[]
    }
    trip: {
      id: string
      name: string
      pointsForWin: number
      pointsForHalf: number
      defaultMaxScore: number | null
    }
  }
  players: MatchPlayerData[]
}

export default function ScoreEntryPage() {
  const params = useParams()
  const router = useRouter()
  const { tripId, roundId, matchId } = params as { tripId: string; roundId: string; matchId: string }

  const [match, setMatch] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentHole, setCurrentHole] = useState(1)
  const [saving, setSaving] = useState(false)
  const [flashConfirm, setFlashConfirm] = useState(false)

  // Local score state: { [matchPlayerId]: { [holeId]: grossScore } }
  const [localScores, setLocalScores] = useState<Record<string, Record<string, number>>>({})

  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null)

  // Load match data
  useEffect(() => {
    async function loadMatch() {
      try {
        const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}/matches/${matchId}`)
        if (!res.ok) throw new Error('Failed to load match')
        const json = await res.json()
        const matchData: MatchData = json.data

        setMatch(matchData)

        // Initialize local scores from existing data
        const scores: Record<string, Record<string, number>> = {}
        for (const player of matchData.players) {
          scores[player.id] = {}
          for (const score of player.scores) {
            scores[player.id][score.holeId] = score.grossScore
          }
        }
        setLocalScores(scores)

        // Set current hole to first unscored hole
        const holes = matchData.round.tee.holes
        const scoredHoleIds = new Set(matchData.players.flatMap(p => p.scores.map(s => s.holeId)))
        const firstUnscored = holes.find(h => !scoredHoleIds.has(h.id))
        if (firstUnscored) setCurrentHole(firstUnscored.number)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match')
      } finally {
        setLoading(false)
      }
    }
    loadMatch()
  }, [tripId, roundId, matchId])

  // Compute match state from local scores (optimistic)
  const computeLocalMatchState = useCallback((): MatchState | null => {
    if (!match) return null

    const holes = match.round.tee.holes.sort((a, b) => a.number - b.number)
    const format = match.round.format
    const effectiveMaxScore = match.round.maxScore ?? match.round.trip.defaultMaxScore

    const side1Players = match.players.filter(p => p.side === 1)
    const side2Players = match.players.filter(p => p.side === 2)

    const holeResults: HoleResult[] = holes.map(hole => {
      const getSideNet = (players: MatchPlayerData[]): (number | null)[] => {
        return players.map(p => {
          const gross = localScores[p.id]?.[hole.id]
          if (gross === undefined) return null
          const capped = applyMaxScore(gross, hole.par, effectiveMaxScore)
          const hasStroke = receivesStroke(p.playingHandicap, hole.handicap)
          return netScore(capped, hasStroke ? 1 : 0)
        })
      }

      const side1Nets = getSideNet(side1Players)
      const side2Nets = getSideNet(side2Players)

      let side1Net: number | null = null
      let side2Net: number | null = null

      if (format === 'FOURBALL' || format === 'SHAMBLE') {
        side1Net = bestBall(side1Nets)
        side2Net = bestBall(side2Nets)
      } else if (format === 'SINGLES') {
        side1Net = side1Nets[0] ?? null
        side2Net = side2Nets[0] ?? null
      } else {
        // FOURSOMES, MODIFIED_ALT_SHOT, SCRAMBLE: first valid score per side
        side1Net = side1Nets.find(s => s !== null) ?? null
        side2Net = side2Nets.find(s => s !== null) ?? null
      }

      return holeWinner(side1Net, side2Net)
    })

    if (format === 'STROKEPLAY') {
      // For strokeplay, return a simplified state
      const holesPlayed = holeResults.filter(r => r !== null).length
      return {
        holesPlayed,
        holesRemaining: holes.length - holesPlayed,
        side1Lead: 0,
        isComplete: holesPlayed === holes.length,
        isDormie: false,
        displayText: `${holesPlayed} of ${holes.length}`,
        resultText: null,
        side1Points: 0,
        side2Points: 0,
      }
    }

    return computeMatchState(
      holeResults,
      holes.length,
      match.round.trip.pointsForWin,
      match.round.trip.pointsForHalf,
    )
  }, [match, localScores])

  // Save scores for current hole to server
  const saveHoleScores = useCallback(async (holeId: string) => {
    if (!match || saving) return

    const scoresToSave = match.players
      .filter(p => localScores[p.id]?.[holeId] !== undefined)
      .map(p => ({
        matchPlayerId: p.id,
        grossScore: localScores[p.id][holeId],
      }))

    if (scoresToSave.length === 0) return

    setSaving(true)
    try {
      await fetch(`/api/trips/${tripId}/rounds/${roundId}/matches/${matchId}/scores`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holeId, scores: scoresToSave }),
      })
    } catch (err) {
      console.error('Failed to save scores:', err)
    } finally {
      setSaving(false)
    }
  }, [match, localScores, saving, tripId, roundId, matchId])

  // Handle score entry for a player
  const handleScore = useCallback((matchPlayerId: string, holeId: string, score: number) => {
    setLocalScores(prev => ({
      ...prev,
      [matchPlayerId]: {
        ...prev[matchPlayerId],
        [holeId]: score,
      },
    }))
  }, [])

  // Check if all players have scored current hole → auto-advance
  useEffect(() => {
    if (!match) return

    const holes = match.round.tee.holes.sort((a, b) => a.number - b.number)
    const currentHoleData = holes.find(h => h.number === currentHole)
    if (!currentHoleData) return

    const allScored = match.players.every(p => localScores[p.id]?.[currentHoleData.id] !== undefined)

    if (allScored) {
      // Save to server
      saveHoleScores(currentHoleData.id)

      // Flash confirmation and auto-advance after delay
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)

      setFlashConfirm(true)
      autoAdvanceTimer.current = setTimeout(() => {
        setFlashConfirm(false)
        if (currentHole < holes.length) {
          setCurrentHole(prev => prev + 1)
        }
      }, 600)
    }

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [localScores, match, currentHole, saveHoleScores])

  // Derived values
  const matchState = computeLocalMatchState()
  const holes = match?.round.tee.holes.sort((a, b) => a.number - b.number) ?? []
  const currentHoleData = holes.find(h => h.number === currentHole)
  const effectiveMaxScore = match ? (match.round.maxScore ?? match.round.trip.defaultMaxScore) : null

  // Scored holes set for nav strip
  const scoredHoles = new Set<number>()
  if (match) {
    for (const hole of holes) {
      const allHaveScore = match.players.every(p => localScores[p.id]?.[hole.id] !== undefined)
      if (allHaveScore) scoredHoles.add(hole.number)
    }
  }

  // Side info for status bar
  const side1Players = match?.players.filter(p => p.side === 1) ?? []
  const side2Players = match?.players.filter(p => p.side === 2) ?? []
  const side1Team = side1Players[0]?.tripPlayer.team
  const side2Team = side2Players[0]?.tripPlayer.team
  const side1Name = side1Team?.name ?? side1Players.map(p => p.tripPlayer.user.name.split(' ')[0]).join(' / ')
  const side2Name = side2Team?.name ?? side2Players.map(p => p.tripPlayer.user.name.split(' ')[0]).join(' / ')
  const side1Color = side1Team?.color ?? '#3b82f6'
  const side2Color = side2Team?.color ?? '#ef4444'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading match...
        </p>
      </div>
    )
  }

  if (error || !match || !currentHoleData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Match not found'}</p>
          <button
            onClick={() => router.back()}
            className="text-emerald-400 underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (match.round.verificationStatus !== 'UNVERIFIED') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-amber-400 mb-2">This round has been verified</p>
          <p className="text-slate-500 text-sm">Scores can no longer be edited.</p>
          <button
            onClick={() => router.push(`/trips/${tripId}/rounds/${roundId}/matches/${matchId}`)}
            className="text-emerald-400 underline mt-4 block"
          >
            View Scorecard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Course & Round */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white text-sm font-semibold">{match.round.tee.course.name}</p>
              <p className="text-slate-500 text-xs" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                Match {match.matchNumber} &middot; {match.round.format.replace(/_/g, ' ')}
              </p>
            </div>
            {saving && (
              <span className="text-xs text-emerald-400 animate-pulse" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                Saving...
              </span>
            )}
          </div>

          {/* Hole Nav Strip */}
          <HoleNavStrip
            totalHoles={holes.length}
            currentHole={currentHole}
            scoredHoles={scoredHoles}
            onHoleSelect={setCurrentHole}
          />
        </div>
      </div>

      {/* Current Hole Info */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className={`text-center mb-4 transition-all duration-300 ${flashConfirm ? 'scale-105' : ''}`}>
          <div className="flex items-center justify-center gap-4 mb-1">
            <span
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {currentHole}
            </span>
            <div className="text-left">
              <p className="text-slate-400 text-xs" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                PAR {currentHoleData.par}
              </p>
              <p className="text-slate-500 text-xs" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                {currentHoleData.yardage} yds &middot; SI {currentHoleData.handicap}
              </p>
            </div>
          </div>

          {flashConfirm && (
            <div className="text-emerald-400 text-sm animate-pulse" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              ✓ Saved
            </div>
          )}
        </div>

        {/* Player Score Inputs */}
        <div className="space-y-1 divide-y divide-slate-800/50">
          {match.players
            .sort((a, b) => a.side - b.side)
            .map(player => {
              const hasStroke = receivesStroke(player.playingHandicap, currentHoleData.handicap)
              const currentScore = localScores[player.id]?.[currentHoleData.id] ?? null

              return (
                <ScoreInput
                  key={player.id}
                  playerName={player.tripPlayer.user.name}
                  teamColor={player.tripPlayer.team?.color ?? null}
                  teamName={player.tripPlayer.team?.name ?? null}
                  par={currentHoleData.par}
                  strokeReceived={hasStroke}
                  currentScore={currentScore}
                  maxScore={effectiveMaxScore}
                  onScore={(score) => handleScore(player.id, currentHoleData.id, score)}
                />
              )
            })}
        </div>
      </div>

      {/* Match Status Bar */}
      {matchState && match.round.format !== 'STROKEPLAY' && (
        <MatchStatusBar
          matchState={matchState}
          side1Name={side1Name}
          side1Color={side1Color}
          side2Name={side2Name}
          side2Color={side2Color}
          format={match.round.format}
        />
      )}

      {/* Strokeplay status */}
      {matchState && match.round.format === 'STROKEPLAY' && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t border-slate-700/50"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
        >
          <div className="max-w-lg mx-auto px-4 py-3 text-center">
            <p className="text-slate-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              {matchState.holesPlayed} of {holes.length} holes complete
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
