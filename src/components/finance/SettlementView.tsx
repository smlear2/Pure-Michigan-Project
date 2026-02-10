'use client'

import { formatCurrency } from '@/lib/utils'
import BalanceBadge from './BalanceBadge'

interface SettlementPlayer {
  tripPlayerId: string
  name: string
  teamName: string | null
  teamColor: string | null
  paymentBalance: number
  expenseBalance: number
  gamblingBalance: number
  netBalance: number
}

interface SimplifiedDebt {
  fromPlayerId: string
  fromName: string
  toPlayerId: string
  toName: string
  amount: number
}

interface SettlementViewProps {
  players: SettlementPlayer[]
  simplifiedDebts: SimplifiedDebt[]
}

export default function SettlementView({ players, simplifiedDebts }: SettlementViewProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  const sorted = [...players].sort((a, b) => b.netBalance - a.netBalance)

  return (
    <div className="space-y-4">
      {/* Net Balances */}
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-white font-semibold">Net Balances</h3>
          <p className="text-slate-500 text-xs mt-0.5" style={monoFont}>Payments + Expenses + Gambling combined</p>
        </div>

        {/* Header */}
        <div className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-slate-800/50 text-xs text-slate-500" style={monoFont}>
          <div className="col-span-3">Player</div>
          <div className="col-span-2 text-right">Payments</div>
          <div className="col-span-2 text-right">Expenses</div>
          <div className="col-span-2 text-right">Gambling</div>
          <div className="col-span-3 text-right">Net</div>
        </div>

        {sorted.map(player => (
          <div
            key={player.tripPlayerId}
            className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-slate-800/30 items-center text-sm"
          >
            <div className="col-span-3 flex items-center gap-2">
              {player.teamColor && (
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.teamColor }} />
              )}
              <span className="text-slate-300 truncate">{player.name}</span>
            </div>
            <div className="col-span-2 text-right">
              <BalanceBadge amount={player.paymentBalance} size="sm" />
            </div>
            <div className="col-span-2 text-right">
              <BalanceBadge amount={player.expenseBalance} size="sm" />
            </div>
            <div className="col-span-2 text-right">
              <BalanceBadge amount={player.gamblingBalance} size="sm" />
            </div>
            <div className="col-span-3 text-right">
              <BalanceBadge amount={player.netBalance} />
            </div>
          </div>
        ))}
      </div>

      {/* Simplified Debts */}
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-white font-semibold">Settle Up</h3>
          <p className="text-slate-500 text-xs mt-0.5" style={monoFont}>
            {simplifiedDebts.length === 0
              ? 'Everyone is settled up'
              : `${simplifiedDebts.length} transfer${simplifiedDebts.length !== 1 ? 's' : ''} to settle all debts`}
          </p>
        </div>

        {simplifiedDebts.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-emerald-400 text-sm" style={monoFont}>All square!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/30">
            {simplifiedDebts.map((debt, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-400 font-medium">{debt.fromName}</span>
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                  <span className="text-emerald-400 font-medium">{debt.toName}</span>
                </div>
                <span className="text-white font-bold" style={monoFont}>
                  {formatCurrency(debt.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
