'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    async function load() {
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
    load()
  }, [tripId, roundId])

  const handleVerify = async () => {
    setVerifying(true)
    setError(null)

    try {
      const res = await fetch(`/api/trips/${tripId}/rounds/${roundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: 'VERIFIED',
        }),
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
          <Link
            href={`/trips/${tripId}/rounds/${roundId}`}
            className="text-slate-400 underline text-sm"
          >
            Back to round
          </Link>
        </div>
      </div>
    )
  }

  const allComplete = matches.every((m: any) => m.status === 'COMPLETE')

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
        <p className="text-slate-400 text-sm mb-6" style={monoFont}>
          {round?.name || `Round ${round?.roundNumber}`} &middot; {round?.tee?.course?.name}
        </p>

        {/* Match summaries */}
        <div className="space-y-3 mb-6">
          {matches.map((match: any) => {
            const side1Players = match.players.filter((p: any) => p.side === 1)
            const side2Players = match.players.filter((p: any) => p.side === 2)
            const side1Team = side1Players[0]?.tripPlayer?.team
            const side2Team = side2Players[0]?.tripPlayer?.team
            const isComplete = match.status === 'COMPLETE'

            return (
              <div
                key={match.id}
                className={`bg-slate-900/60 rounded-xl border px-4 py-3 ${
                  isComplete ? 'border-slate-800' : 'border-amber-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500" style={monoFont}>#{match.matchNumber}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: side1Team?.color ?? '#3b82f6' }} />
                      <span className="text-sm text-slate-300">{side1Team?.name ?? 'Side 1'}</span>
                      <span className="text-slate-600 text-xs">vs</span>
                      <span className="text-sm text-slate-300">{side2Team?.name ?? 'Side 2'}</span>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: side2Team?.color ?? '#ef4444' }} />
                    </div>
                  </div>
                  <div>
                    {isComplete ? (
                      <span className="text-white font-semibold text-sm" style={monoFont}>
                        {match.resultText || 'Complete'}
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs" style={monoFont}>
                        NOT COMPLETE
                      </span>
                    )}
                  </div>
                </div>

                {/* Player scores summary */}
                <div className="mt-2 text-xs text-slate-500" style={monoFont}>
                  {match.players.map((p: any) => {
                    const totalGross = p.scores?.reduce((s: number, sc: any) => s + sc.grossScore, 0) ?? 0
                    return (
                      <span key={p.id} className="mr-3">
                        {p.tripPlayer.user.name.split(' ')[0]}: {totalGross > 0 ? totalGross : '-'}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Verification action */}
        {!allComplete && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 text-center mb-4">
            <p className="text-amber-400 text-sm">
              All matches must be complete before verification.
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
            disabled={!allComplete || verifying}
            className={`
              px-8 py-3 rounded-lg font-medium text-white transition-colors
              ${allComplete && !verifying
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-slate-700 cursor-not-allowed'
              }
            `}
          >
            {verifying ? 'Verifying...' : 'Verify Scores'}
          </button>
          <p className="text-slate-500 text-xs mt-2" style={monoFont}>
            Once verified, scores cannot be edited.
          </p>
        </div>
      </div>
    </div>
  )
}
