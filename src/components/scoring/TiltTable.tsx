'use client'

import { formatCurrency } from '@/lib/utils'

interface TiltPlayerHole {
  holeNumber: number
  netVsPar: number
  basePoints: number
  multiplier: number
  points: number
  runningTotal: number
}

interface TiltPlayer {
  playerId: string
  playerName: string
  teamName: string | null
  teamColor: string | null
  totalPoints: number
  holes: TiltPlayerHole[]
  finalMultiplier: number
}

interface TiltTableProps {
  players: TiltPlayer[]
  totalPot: number
  entryFee: number
  playerCount: number
}

export default function TiltTable({ players, totalPot, entryFee, playerCount }: TiltTableProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (players.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No TILT data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">TILT</h3>
            <p className="text-slate-500 text-xs mt-0.5" style={monoFont}>Modified Stableford with multiplier</p>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold" style={monoFont}>{formatCurrency(totalPot)}</p>
            <p className="text-slate-500 text-xs" style={monoFont}>{formatCurrency(entryFee)} x {playerCount} players</p>
          </div>
        </div>
      </div>

      {/* Player standings */}
      <div className="divide-y divide-slate-800/30">
        {players.map((player, idx) => (
          <div key={player.playerId} className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-5" style={monoFont}>
                  {idx + 1}.
                </span>
                {player.teamColor && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.teamColor }} />
                )}
                <span className="text-slate-300 font-medium">{player.playerName}</span>
              </div>
              <div className="flex items-center gap-3">
                {player.finalMultiplier > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400" style={monoFont}>
                    {player.finalMultiplier}x
                  </span>
                )}
                <span
                  className={`font-bold ${player.totalPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  style={monoFont}
                >
                  {player.totalPoints > 0 ? '+' : ''}{player.totalPoints} pts
                </span>
              </div>
            </div>

            {/* Hole-by-hole multiplier strip */}
            <div className="flex gap-0.5 mt-1.5 overflow-x-auto">
              {player.holes.map(hole => {
                let bg = 'bg-slate-800/40'
                let text = 'text-slate-500'
                if (hole.points > 0) { bg = 'bg-emerald-900/30'; text = 'text-emerald-400' }
                if (hole.points < 0) { bg = 'bg-red-900/30'; text = 'text-red-400' }

                return (
                  <div
                    key={hole.holeNumber}
                    className={`text-center rounded px-1 py-0.5 min-w-[28px] ${bg}`}
                    title={`Hole ${hole.holeNumber}: ${hole.points > 0 ? '+' : ''}${hole.points} (${hole.multiplier}x)`}
                  >
                    <span className="text-slate-600 text-[9px] block" style={monoFont}>{hole.holeNumber}</span>
                    <span className={`text-[10px] font-medium ${text}`} style={monoFont}>
                      {hole.multiplier > 1 ? `${hole.multiplier}x` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
