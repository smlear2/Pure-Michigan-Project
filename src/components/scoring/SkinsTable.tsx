'use client'

interface SkinHole {
  holeNumber: number
  winnerId: string | null
  winnerScore: number | null
  value: number
}

interface SkinPlayerTotal {
  playerId: string
  playerName: string
  teamName: string | null
  teamColor: string | null
  skinsWon: number
  moneyWon: number
}

interface SkinsTableProps {
  holes: SkinHole[]
  playerTotals: SkinPlayerTotal[]
  totalPot: number
  skinsAwarded: number
  skinValue: number
  entryFee: number
  playerCount: number
}

export default function SkinsTable({
  holes,
  playerTotals,
  totalPot,
  skinsAwarded,
  skinValue,
  entryFee,
  playerCount,
}: SkinsTableProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Skins</h3>
          <div className="text-right">
            <p className="text-emerald-400 font-bold" style={monoFont}>${totalPot}</p>
            <p className="text-slate-500 text-xs" style={monoFont}>${entryFee} × {playerCount} players</p>
          </div>
        </div>
      </div>

      {/* Player totals */}
      {playerTotals.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-800/50">
          <div className="space-y-1">
            {playerTotals.map(player => (
              <div key={player.playerId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {player.teamColor && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.teamColor }} />
                  )}
                  <span className="text-slate-300">{player.playerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs" style={monoFont}>
                    {player.skinsWon} skin{player.skinsWon !== 1 ? 's' : ''}
                  </span>
                  <span className="text-emerald-400 font-semibold" style={monoFont}>
                    ${player.moneyWon.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hole-by-hole results */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-6 gap-1 text-xs" style={monoFont}>
          {holes.map(hole => {
            const winner = hole.winnerId
              ? playerTotals.find(p => p.playerId === hole.winnerId)
              : null

            return (
              <div
                key={hole.holeNumber}
                className={`text-center py-1 rounded ${hole.winnerId ? 'bg-emerald-900/20' : 'bg-slate-800/30'}`}
              >
                <span className="text-slate-500 block">{hole.holeNumber}</span>
                {hole.winnerId && winner ? (
                  <>
                    <span
                      className="block text-xs font-medium truncate px-0.5"
                      style={{ color: winner.teamColor || '#10b981' }}
                    >
                      {winner.playerName.split(' ')[0]}
                    </span>
                    {hole.winnerScore !== null && (
                      <span className="text-slate-500 text-[10px]">{hole.winnerScore}</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-600 block">—</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-2 border-t border-slate-800/50">
        <p className="text-slate-500 text-xs" style={monoFont}>
          {skinsAwarded} skins awarded &middot; ${skinValue.toFixed(0)} per skin
        </p>
      </div>
    </div>
  )
}
