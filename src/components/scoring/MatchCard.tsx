'use client'

import Link from 'next/link'

interface MatchCardProps {
  matchId: string
  matchNumber: number
  tripId: string
  roundId: string
  status: string
  resultText: string | null
  side1Points: number
  side2Points: number
  format: string
  side1: {
    name: string
    color: string
    playerNames: string[]
  }
  side2: {
    name: string
    color: string
    playerNames: string[]
  }
  displayText?: string
  holesPlayed?: number
}

export default function MatchCard({
  matchId,
  matchNumber,
  tripId,
  roundId,
  status,
  resultText,
  side1Points,
  side2Points,
  format,
  side1,
  side2,
  displayText,
  holesPlayed,
}: MatchCardProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  const isComplete = status === 'COMPLETE'
  const isInProgress = status === 'IN_PROGRESS'

  // Determine winner for visual styling
  const side1Won = isComplete && side1Points > side2Points
  const side2Won = isComplete && side2Points > side1Points

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50">
        <span className="text-xs text-slate-500" style={monoFont}>Match {matchNumber}</span>
        {isComplete && (
          <span className="text-xs text-emerald-400" style={monoFont}>FINAL</span>
        )}
        {isInProgress && (
          <span className="text-xs text-amber-400 animate-pulse" style={monoFont}>LIVE</span>
        )}
        {status === 'PENDING' && (
          <span className="text-xs text-slate-600" style={monoFont}>Not Started</span>
        )}
      </div>

      {/* Match body */}
      <div className="px-4 py-3">
        {/* Side 1 */}
        <div className={`flex items-center justify-between mb-2 ${side2Won ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: side1.color }} />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{side1.name}</p>
              <p className="text-slate-500 text-xs truncate">{side1.playerNames.join(' & ')}</p>
            </div>
          </div>
          {isComplete && (
            <span className={`text-lg font-bold ml-2 ${side1Won ? 'text-emerald-400' : 'text-slate-500'}`} style={monoFont}>
              {side1Points}
            </span>
          )}
        </div>

        {/* Side 2 */}
        <div className={`flex items-center justify-between ${side1Won ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: side2.color }} />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{side2.name}</p>
              <p className="text-slate-500 text-xs truncate">{side2.playerNames.join(' & ')}</p>
            </div>
          </div>
          {isComplete && (
            <span className={`text-lg font-bold ml-2 ${side2Won ? 'text-emerald-400' : 'text-slate-500'}`} style={monoFont}>
              {side2Points}
            </span>
          )}
        </div>

        {/* Result / Status */}
        {isComplete && resultText && (
          <div className="mt-2 pt-2 border-t border-slate-800/50 text-center">
            <span className="text-white font-semibold text-sm" style={monoFont}>{resultText}</span>
          </div>
        )}
        {isInProgress && displayText && (
          <div className="mt-2 pt-2 border-t border-slate-800/50 text-center">
            <span className="text-slate-300 text-sm" style={monoFont}>{displayText}</span>
            {holesPlayed !== undefined && (
              <span className="text-slate-500 text-xs ml-2">thru {holesPlayed}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t border-slate-800/50 flex gap-2">
        <Link
          href={`/trips/${tripId}/rounds/${roundId}/matches/${matchId}`}
          className="text-xs text-slate-400 hover:text-white transition-colors"
          style={monoFont}
        >
          Scorecard →
        </Link>
        {!isComplete && (
          <Link
            href={`/trips/${tripId}/rounds/${roundId}/matches/${matchId}/score`}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors ml-auto"
            style={monoFont}
          >
            Enter Scores →
          </Link>
        )}
      </div>
    </div>
  )
}
