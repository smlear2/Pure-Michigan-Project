'use client'

interface PlayerStat {
  tripPlayerId: string
  name: string
  teamName: string | null
  teamColor: string | null
  handicap: number
  matchesPlayed: number
  matchesWon: number
  matchesLost: number
  matchesHalved: number
  matchPoints: number
  holesPlayed: number
  holesWon: number
  holesLost: number
  holesHalved: number
  avgVsPar: number
  netAvgVsPar: number
  birdies: number
  eagles: number
  pars: number
  bogeys: number
  doublesPlus: number
  skinsWon: number
  skinsMoney: number
  mvpScore: number | null
}

interface PlayerLeaderboardProps {
  players: PlayerStat[]
}

export default function PlayerLeaderboard({ players }: PlayerLeaderboardProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (players.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No player stats yet</p>
      </div>
    )
  }

  const hasMvp = players.some(p => p.mvpScore !== null)

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-white font-semibold">Player Leaderboard</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={monoFont}>
          <thead>
            <tr className="text-slate-500 text-xs border-b border-slate-800">
              <th className="text-left px-4 py-2 font-medium">Player</th>
              {hasMvp && <th className="text-center px-2 py-2 font-medium">MVP</th>}
              <th className="text-center px-2 py-2 font-medium">Record</th>
              <th className="text-center px-2 py-2 font-medium">Pts</th>
              <th className="text-center px-2 py-2 font-medium" title="Holes Won">HW</th>
              <th className="text-center px-2 py-2 font-medium">Avg</th>
              <th className="text-center px-2 py-2 font-medium" title="Birdies or better">Brd</th>
              <th className="text-center px-2 py-2 font-medium">Skins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {players.map((p, idx) => (
              <tr key={p.tripPlayerId} className="hover:bg-slate-800/30 transition-colors">
                {/* Player name + team dot */}
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {p.teamColor && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.teamColor }}
                      />
                    )}
                    <span className="text-white text-sm">{p.name}</span>
                    <span className="text-slate-600 text-xs">({p.handicap})</span>
                  </div>
                </td>

                {/* MVP score */}
                {hasMvp && (
                  <td className="text-center px-2 py-2.5">
                    {p.mvpScore !== null ? (
                      <span className={`font-bold ${idx === 0 ? 'text-amber-400' : 'text-white'}`}>
                        {p.mvpScore}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )}

                {/* Record: W-L-H */}
                <td className="text-center px-2 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                  {p.matchesPlayed > 0
                    ? `${p.matchesWon}-${p.matchesLost}-${p.matchesHalved}`
                    : '—'}
                </td>

                {/* Match points */}
                <td className="text-center px-2 py-2.5">
                  <span className="text-white font-medium">{p.matchPoints}</span>
                </td>

                {/* Holes won */}
                <td className="text-center px-2 py-2.5 text-slate-400">
                  {p.holesWon || '—'}
                </td>

                {/* Avg vs par */}
                <td className="text-center px-2 py-2.5">
                  {p.holesPlayed > 0 ? (
                    <span className={p.avgVsPar <= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {p.avgVsPar > 0 ? '+' : ''}{p.avgVsPar.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                {/* Birdies (includes eagles) */}
                <td className="text-center px-2 py-2.5">
                  {(p.birdies + p.eagles) > 0 ? (
                    <span className="text-emerald-400">{p.birdies + p.eagles}</span>
                  ) : (
                    <span className="text-slate-600">0</span>
                  )}
                </td>

                {/* Skins */}
                <td className="text-center px-2 py-2.5 whitespace-nowrap">
                  {p.skinsWon > 0 ? (
                    <span className="text-amber-400">
                      {p.skinsWon} / ${p.skinsMoney}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
