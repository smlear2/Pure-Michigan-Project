'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyRoundPage() {
  const params = useParams()
  const router = useRouter()
  const { tripId, roundId } = params as { tripId: string; roundId: string }

  const [matches, setMatches] = useState<any[]>([])
  const [round, setRound] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{
    matchId: string; playerId: string; holeId: string
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [tripId, roundId])

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  async function loadData() {
    try {
      const [matchesRes, roundsRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/rounds/${roundId}/matches`),
        fetch(`/api/trips/${tripId}/rounds`),
      ])

      if (matchesRes.ok) {
        const json = await matchesRes.json()
        setMatches(json.data)
      }

      if (roundsRes.ok) {
        const json = await roundsRes.json()
        const thisRound = json.data?.find((r: any) => r.id === roundId)
        if (thisRound) setRound(thisRound)
      }
    } catch {
      setError('Failed to load round data')
    } finally {
      setLoading(false)
    }
  }

  const handleAttest = async (matchId: string, side: 1 | 2) => {
    const match = matches.find((m: any) => m.id === matchId)
    if (!match) return

    const currentValue = side === 1 ? match.side1Attested : match.side2Attested

    try {
      const res = await fetch(
        `/api/trips/${tripId}/rounds/${roundId}/matches/${matchId}/attest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ side, attested: !currentValue }),
        }
      )

      if (res.ok) {
        // Update local state
        setMatches(prev => prev.map(m => {
          if (m.id !== matchId) return m
          return {
            ...m,
            side1Attested: side === 1 ? !currentValue : m.side1Attested,
            side2Attested: side === 2 ? !currentValue : m.side2Attested,
          }
        }))
      }
    } catch (err) {
      console.error('Failed to attest:', err)
    }
  }

  const startEdit = (matchId: string, playerId: string, holeId: string, currentGross: number) => {
    setEditingCell({ matchId, playerId, holeId })
    setEditValue(String(currentGross))
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCell || savingEdit) return
    const newGross = parseInt(editValue)
    if (isNaN(newGross) || newGross < 1 || newGross > 20) {
      cancelEdit()
      return
    }

    setSavingEdit(true)
    try {
      const res = await fetch(
        `/api/trips/${tripId}/rounds/${roundId}/matches/${editingCell.matchId}/scores`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holeId: editingCell.holeId,
            scores: [{ matchPlayerId: editingCell.playerId, grossScore: newGross }],
          }),
        }
      )

      if (res.ok) {
        // Refetch matches to get updated data + cleared attestation
        const matchesRes = await fetch(`/api/trips/${tripId}/rounds/${roundId}/matches`)
        if (matchesRes.ok) {
          const json = await matchesRes.json()
          setMatches(json.data)
        }
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
    } finally {
      setSavingEdit(false)
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setError(null)

    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'VERIFIED' }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || 'Failed to verify round')
      }

      router.push(`/trips/${tripId}/rounds/${roundId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={monoFont}>Loading...</p>
      </div>
    )
  }

  if (round?.verificationStatus === 'VERIFIED') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-emerald-400 font-medium mb-2">This round has already been verified</p>
          <Link href={`/trips/${tripId}/rounds/${roundId}`} className="text-slate-400 underline text-sm">
            Back to round
          </Link>
        </div>
      </div>
    )
  }

  const allComplete = matches.every((m: any) => m.status === 'COMPLETE')
  const allAttested = allComplete && matches.length > 0 && matches.every((m: any) => m.side1Attested && m.side2Attested)

  function scoreColor(gross: number, par: number): string {
    const diff = gross - par
    if (diff <= -2) return 'text-yellow-400'
    if (diff === -1) return 'text-emerald-400'
    if (diff === 0) return 'text-slate-300'
    if (diff === 1) return 'text-red-400'
    return 'text-red-500'
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4" style={monoFont}>
          <Link href={`/trips/${tripId}`} className="hover:text-slate-300">Trip</Link>
          <span>/</span>
          <Link href={`/trips/${tripId}/rounds/${roundId}`} className="hover:text-slate-300">
            Round {round?.roundNumber ?? ''}
          </Link>
          <span>/</span>
          <span className="text-slate-400">Verify</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
          Verify Scores
        </h1>
        <p className="text-slate-400 text-sm mb-1" style={monoFont}>
          {round?.name || `Round ${round?.roundNumber}`} &middot; {round?.tee?.course?.name}
        </p>
        <p className="text-slate-500 text-xs mb-6" style={monoFont}>
          Tap any score to edit. Both sides must confirm each match.
        </p>

        {/* Matches */}
        <div className="space-y-6 mb-8">
          {matches.map((match: any) => {
            const isComplete = match.status === 'COMPLETE'
            const side1Players = match.players.filter((p: any) => p.side === 1)
            const side2Players = match.players.filter((p: any) => p.side === 2)
            const side1Team = side1Players[0]?.tripPlayer?.team
            const side2Team = side2Players[0]?.tripPlayer?.team
            const side1Name = side1Team?.name ?? side1Players.map((p: any) => p.tripPlayer.user.name.split(' ')[0]).join('/')
            const side2Name = side2Team?.name ?? side2Players.map((p: any) => p.tripPlayer.user.name.split(' ')[0]).join('/')
            const side1Color = side1Team?.color ?? '#3b82f6'
            const side2Color = side2Team?.color ?? '#ef4444'
            const bothAttested = match.side1Attested && match.side2Attested

            // Build holes from score data
            const allScores = match.players.flatMap((p: any) => p.scores || [])
            const holesMap = new Map<number, any>()
            allScores.forEach((s: any) => {
              if (s.hole && !holesMap.has(s.hole.number)) holesMap.set(s.hole.number, s.hole)
            })
            const holes = Array.from(holesMap.values()).sort((a: any, b: any) => a.number - b.number)
            const front9 = holes.filter((h: any) => h.number <= 9)
            const back9 = holes.filter((h: any) => h.number > 9)

            function renderNine(nineHoles: any[]) {
              if (nineHoles.length === 0) return null
              const totalPar = nineHoles.reduce((s: number, h: any) => s + h.par, 0)

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={monoFont}>
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-1 px-2 text-slate-500 w-20">Hole</th>
                        {nineHoles.map((h: any) => (
                          <th key={h.number} className="text-center py-1 px-1 text-slate-400 min-w-[28px]">{h.number}</th>
                        ))}
                        <th className="text-center py-1 px-2 text-slate-400">TOT</th>
                      </tr>
                      <tr className="border-b border-slate-800">
                        <td className="py-1 px-2 text-slate-500">Par</td>
                        {nineHoles.map((h: any) => (
                          <td key={h.number} className="text-center py-1 px-1 text-slate-500">{h.par}</td>
                        ))}
                        <td className="text-center py-1 px-2 text-slate-500">{totalPar}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {match.players.map((p: any) => {
                        const team = p.tripPlayer?.team
                        const playerScores = p.scores || []
                        const nineScores = nineHoles.map((h: any) => {
                          const sc = playerScores.find((s: any) => s.hole?.number === h.number)
                          return sc ? { gross: sc.grossScore, holeId: sc.holeId } : null
                        })
                        const total = nineScores.reduce((s: number, sc) => s + (sc?.gross ?? 0), 0)
                        const hasScores = nineScores.some(s => s !== null)

                        return (
                          <tr key={p.id} className="border-b border-slate-800/50">
                            <td className="py-1 px-2 truncate max-w-[80px]">
                              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: team?.color ?? (p.side === 1 ? '#3b82f6' : '#ef4444') }} />
                              <span className="text-slate-300">{p.tripPlayer.user.name.split(' ')[0]}</span>
                            </td>
                            {nineHoles.map((h: any, i: number) => {
                              const sc = nineScores[i]
                              const isEditing = editingCell?.matchId === match.id && editingCell?.playerId === p.id && editingCell?.holeId === h.id

                              if (isEditing) {
                                return (
                                  <td key={h.number} className="text-center py-0.5 px-0">
                                    <input
                                      ref={editInputRef}
                                      type="number"
                                      className="w-7 text-center bg-slate-800 text-white border border-emerald-500 rounded text-xs outline-none py-0.5"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') saveEdit()
                                        if (e.key === 'Escape') cancelEdit()
                                      }}
                                    />
                                  </td>
                                )
                              }

                              return (
                                <td
                                  key={h.number}
                                  className={`text-center py-1 px-1 cursor-pointer hover:bg-slate-800/80 rounded transition-colors ${sc ? scoreColor(sc.gross, h.par) : 'text-slate-600'}`}
                                  onClick={() => sc && startEdit(match.id, p.id, h.id, sc.gross)}
                                >
                                  {sc ? sc.gross : '-'}
                                </td>
                              )
                            })}
                            <td className="text-center py-1 px-2 text-slate-300 font-semibold">
                              {hasScores ? total : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }

            return (
              <div
                key={match.id}
                className={`bg-slate-900/60 rounded-xl border overflow-hidden ${
                  bothAttested ? 'border-emerald-700/50' : isComplete ? 'border-slate-800' : 'border-amber-700/50'
                }`}
              >
                {/* Match header */}
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500" style={monoFont}>Match {match.matchNumber}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: side1Color }} />
                      <span className="text-sm text-slate-300">{side1Name}</span>
                      <span className="text-slate-600 text-xs">vs</span>
                      <span className="text-sm text-slate-300">{side2Name}</span>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: side2Color }} />
                    </div>
                  </div>
                  {isComplete && (
                    <span className="text-white font-semibold text-sm" style={monoFont}>
                      {match.resultText || 'Complete'}
                    </span>
                  )}
                </div>

                {/* Hole-by-hole scores */}
                <div className="px-2 py-2 space-y-1">
                  {renderNine(front9)}
                  {renderNine(back9)}
                </div>

                {/* Attestation buttons */}
                {isComplete && (
                  <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleAttest(match.id, 1)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        match.side1Attested
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-700/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
                      }`}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: side1Color }}
                      />
                      {match.side1Attested ? `${side1Name} Confirmed` : `${side1Name} Confirm`}
                    </button>

                    <button
                      onClick={() => handleAttest(match.id, 2)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        match.side2Attested
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-700/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
                      }`}
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: side2Color }}
                      />
                      {match.side2Attested ? `${side2Name} Confirmed` : `${side2Name} Confirm`}
                    </button>
                  </div>
                )}

                {/* Both attested badge */}
                {bothAttested && (
                  <div className="px-4 py-2 bg-emerald-900/20 text-center">
                    <span className="text-emerald-400 text-xs font-medium" style={monoFont}>
                      Both Sides Confirmed
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Status messages */}
        {!allComplete && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 text-center mb-4">
            <p className="text-amber-400 text-sm">All matches must be complete before verification.</p>
          </div>
        )}

        {allComplete && !allAttested && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center mb-4">
            <p className="text-slate-400 text-sm">
              Both sides must confirm each match before the round can be verified.
              ({matches.filter((m: any) => m.side1Attested && m.side2Attested).length}/{matches.length} fully confirmed)
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-center mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleVerify}
            disabled={!allAttested || verifying}
            className={`
              px-8 py-3 rounded-lg font-medium text-white transition-colors
              ${allAttested && !verifying
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-slate-700 cursor-not-allowed'
              }
            `}
          >
            {verifying ? 'Verifying...' : 'Verify Round'}
          </button>
          <p className="text-slate-500 text-xs mt-2" style={monoFont}>
            Once verified, scores cannot be edited.
          </p>
        </div>
      </div>
    </div>
  )
}
