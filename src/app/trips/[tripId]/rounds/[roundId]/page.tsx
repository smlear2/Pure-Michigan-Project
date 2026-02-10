'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MatchCard from '@/components/scoring/MatchCard'
import SkinsTable from '@/components/scoring/SkinsTable'
import TiltTable from '@/components/scoring/TiltTable'
import SideGamesCard from '@/components/scoring/SideGamesCard'
import SideGameForm from '@/components/scoring/SideGameForm'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { createClient } from '@/lib/supabase/client'

export default function RoundViewPage() {
  const params = useParams()
  const { tripId, roundId } = params as { tripId: string; roundId: string }

  const [matches, setMatches] = useState<any[]>([])
  const [round, setRound] = useState<any>(null)
  const [skins, setSkins] = useState<any>(null)
  const [tilt, setTilt] = useState<any>(null)
  const [sideGames, setSideGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [showSideGameForm, setShowSideGameForm] = useState(false)
  const [tripPlayers, setTripPlayers] = useState<any[]>([])
  const [holes, setHoles] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [matchesRes, skinsRes, tiltRes, sideGamesRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/rounds/${roundId}/matches`),
        fetch(`/api/trips/${tripId}/rounds/${roundId}/skins`),
        fetch(`/api/trips/${tripId}/rounds/${roundId}/tilt`),
        fetch(`/api/trips/${tripId}/rounds/${roundId}/side-games`),
      ])

      if (matchesRes.ok) {
        const json = await matchesRes.json()
        setMatches(json.data)
      }

      if (skinsRes.ok) {
        const json = await skinsRes.json()
        setSkins(json.data)
      }

      if (tiltRes.ok) {
        const json = await tiltRes.json()
        setTilt(json.data)
      }

      if (sideGamesRes.ok) {
        const json = await sideGamesRes.json()
        setSideGames(json.data)
      }
    } catch (err) {
      console.error('Failed to refresh data:', err)
    }
  }, [tripId, roundId])

  // Initial load — fetch everything + round details + organizer check
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const [, { data: authData }] = await Promise.all([
          fetchData(),
          supabase.auth.getUser(),
        ])

        // Fetch round details
        const roundRes = await fetch(`/api/trips/${tripId}/rounds/${roundId}`)
        if (!roundRes.ok) {
          const roundsRes = await fetch(`/api/trips/${tripId}/rounds`)
          if (roundsRes.ok) {
            const roundsJson = await roundsRes.json()
            const thisRound = roundsJson.data?.find((r: any) => r.id === roundId)
            if (thisRound) setRound(thisRound)
          }
        } else {
          const roundJson = await roundRes.json()
          setRound(roundJson.data)
        }

        // Fetch trip for organizer check + player list + holes
        const tripRes = await fetch(`/api/trips/${tripId}`)
        if (tripRes.ok) {
          const tripJson = await tripRes.json()
          const tripData = tripJson.data
          const userEmail = authData?.user?.email

          if (userEmail && tripData.tripPlayers) {
            const myTp = tripData.tripPlayers.find(
              (tp: any) => tp.user.email === userEmail
            )
            if (myTp) {
              setIsOrganizer(myTp.role === 'ORGANIZER')
            }
            setTripPlayers(tripData.tripPlayers.map((tp: any) => ({
              id: tp.id,
              user: { name: tp.user.name },
              team: tp.team,
            })))
          }
        }

        // Get holes from round tee data
        const roundDetailRes = await fetch(`/api/trips/${tripId}/rounds/${roundId}`)
        if (roundDetailRes.ok) {
          const json = await roundDetailRes.json()
          if (json.data?.tee?.holes) {
            setHoles(json.data.tee.holes.sort((a: any, b: any) => a.number - b.number))
          }
        }
      } catch (err) {
        console.error('Failed to load round:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tripId, roundId, fetchData])

  // Realtime subscriptions — refresh data on any Score/Match/SideGame change
  const isLive = matches.some((m: any) => m.status !== 'COMPLETE')

  useRealtimeSubscription({
    table: 'Score',
    onUpdate: fetchData,
    enabled: isLive,
  })

  useRealtimeSubscription({
    table: 'Match',
    onUpdate: fetchData,
    enabled: isLive,
  })

  useRealtimeSubscription({
    table: 'SideGame',
    onUpdate: fetchData,
    enabled: true,
  })

  const handleDeleteSideGame = async (sideGameId: string) => {
    const res = await fetch(
      `/api/trips/${tripId}/rounds/${roundId}/side-games/${sideGameId}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      setSideGames(prev => prev.filter(g => g.id !== sideGameId))
    }
  }

  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={monoFont}>Loading round...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4" style={monoFont}>
          <Link href={`/trips/${tripId}`} className="hover:text-slate-300">Trip</Link>
          <span>/</span>
          <span className="text-slate-400">Round {round?.roundNumber ?? ''}</span>
          {isLive && (
            <span className="ml-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[10px] uppercase tracking-wider">Live</span>
            </span>
          )}
        </div>

        {/* Round header */}
        {round && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {round.name || `Round ${round.roundNumber}`}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400" style={monoFont}>
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
            {round.verificationStatus === 'VERIFIED' && (
              <span className="inline-block mt-2 text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded" style={monoFont}>
                VERIFIED
              </span>
            )}
          </div>
        )}

        {/* Matches */}
        <div className="space-y-3 mb-6">
          {matches.length === 0 ? (
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-8 text-center">
              <p className="text-slate-500" style={monoFont}>No matches created yet</p>
            </div>
          ) : (
            matches.map((match: any) => {
              const side1Players = match.players.filter((p: any) => p.side === 1)
              const side2Players = match.players.filter((p: any) => p.side === 2)
              const side1Team = side1Players[0]?.tripPlayer?.team
              const side2Team = side2Players[0]?.tripPlayer?.team

              return (
                <MatchCard
                  key={match.id}
                  matchId={match.id}
                  matchNumber={match.matchNumber}
                  tripId={tripId}
                  roundId={roundId}
                  status={match.status}
                  resultText={match.resultText}
                  side1Points={match.side1Points}
                  side2Points={match.side2Points}
                  format={round?.format ?? ''}
                  side1={{
                    name: side1Team?.name ?? 'Side 1',
                    color: side1Team?.color ?? '#3b82f6',
                    playerNames: side1Players.map((p: any) => p.tripPlayer.user.name),
                  }}
                  side2={{
                    name: side2Team?.name ?? 'Side 2',
                    color: side2Team?.color ?? '#ef4444',
                    playerNames: side2Players.map((p: any) => p.tripPlayer.user.name),
                  }}
                />
              )
            })
          )}
        </div>

        {/* Skins */}
        {skins && skins.results !== null && skins.holes && (
          <div className="mb-6">
            <SkinsTable
              holes={skins.holes}
              playerTotals={skins.playerTotals}
              totalPot={skins.totalPot}
              skinsAwarded={skins.skinsAwarded}
              skinValue={skins.skinValue}
              entryFee={skins.entryFee}
              playerCount={skins.playerCount}
            />
          </div>
        )}

        {/* TILT */}
        {tilt && tilt.results !== null && tilt.players && (
          <div className="mb-6">
            <TiltTable
              players={tilt.players}
              totalPot={tilt.totalPot}
              entryFee={tilt.entryFee}
              playerCount={tilt.playerCount}
            />
          </div>
        )}

        {/* Side Games */}
        {sideGames.length > 0 && (
          <div className="mb-6">
            <SideGamesCard
              sideGames={sideGames}
              isOrganizer={isOrganizer}
              onDelete={handleDeleteSideGame}
            />
          </div>
        )}

        {/* Side Game Form (organizer only) */}
        {isOrganizer && holes.length > 0 && (
          <div className="mb-6">
            {showSideGameForm ? (
              <SideGameForm
                tripId={tripId}
                roundId={roundId}
                holes={holes}
                players={tripPlayers}
                onSuccess={() => {
                  setShowSideGameForm(false)
                  fetchData()
                }}
                onCancel={() => setShowSideGameForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowSideGameForm(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 text-sm transition-colors"
                style={monoFont}
              >
                + Record Side Game
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6" style={monoFont}>
          <Link
            href={`/trips/${tripId}/rounds/${roundId}/print`}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-colors"
          >
            Print Scorecards
          </Link>
          {round && round.verificationStatus === 'UNVERIFIED' && matches.every((m: any) => m.status === 'COMPLETE') && matches.length > 0 && (
            <Link
              href={`/trips/${tripId}/rounds/${roundId}/verify`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors"
            >
              Verify Scores
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
