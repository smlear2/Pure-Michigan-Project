'use client'

import { formatCurrency } from '@/lib/utils'
import BalanceBadge from './BalanceBadge'

interface RoundBreakdown {
  roundName: string
  skinsWon: number
  moneyWon: number
  entryFee: number
}

interface LedgerPlayer {
  tripPlayerId: string
  name: string
  teamName: string | null
  teamColor: string | null
  totalSkinsWon: number
  totalMoneyWon: number
  totalEntryFees: number
  skinsNet: number
  roundBreakdown: RoundBreakdown[]
}

interface GamblingLedgerProps {
  players: LedgerPlayer[]
}

export default function GamblingLedger({ players }: GamblingLedgerProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (players.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No skins data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-white font-semibold">Gambling Ledger</h3>
        <p className="text-slate-500 text-xs mt-0.5" style={monoFont}>Skins profit & loss by player</p>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-slate-800/50 text-xs text-slate-500" style={monoFont}>
        <div className="col-span-4">Player</div>
        <div className="col-span-2 text-right">Skins</div>
        <div className="col-span-2 text-right">Won</div>
        <div className="col-span-2 text-right">Entry</div>
        <div className="col-span-2 text-right">Net</div>
      </div>

      {/* Rows */}
      {players.map(player => (
        <div key={player.tripPlayerId}>
          <div className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-slate-800/30 items-center text-sm">
            <div className="col-span-4 flex items-center gap-2">
              {player.teamColor && (
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.teamColor }} />
              )}
              <span className="text-slate-300 truncate">{player.name}</span>
            </div>
            <div className="col-span-2 text-right text-slate-400" style={monoFont}>
              {player.totalSkinsWon}
            </div>
            <div className="col-span-2 text-right text-emerald-400" style={monoFont}>
              {formatCurrency(player.totalMoneyWon)}
            </div>
            <div className="col-span-2 text-right text-slate-400" style={monoFont}>
              {formatCurrency(player.totalEntryFees)}
            </div>
            <div className="col-span-2 text-right">
              <BalanceBadge amount={player.skinsNet} size="sm" />
            </div>
          </div>

          {/* Per-round breakdown (collapsible could be added later) */}
          {player.roundBreakdown.length > 1 && player.roundBreakdown.map((round, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 px-4 py-1 border-b border-slate-800/20 items-center text-xs text-slate-600">
              <div className="col-span-4 pl-5">{round.roundName}</div>
              <div className="col-span-2 text-right" style={monoFont}>{round.skinsWon}</div>
              <div className="col-span-2 text-right" style={monoFont}>{formatCurrency(round.moneyWon)}</div>
              <div className="col-span-2 text-right" style={monoFont}>{formatCurrency(round.entryFee)}</div>
              <div className="col-span-2 text-right" style={monoFont}>{formatCurrency(round.moneyWon - round.entryFee)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
