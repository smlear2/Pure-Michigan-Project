'use client'

interface TeamStanding {
  teamId: string
  teamName: string
  teamColor: string
  totalPoints: number
  matchesWon: number
  matchesLost: number
  matchesHalved: number
  isDefendingChampion: boolean
  roundBreakdown: {
    roundId: string
    roundNumber: number
    roundName: string | null
    format: string
    points: number
  }[]
}

interface TeamLeaderboardProps {
  standings: TeamStanding[]
  pointsToWin: number | null
  totalMatchesPlayed: number
}

export default function TeamLeaderboard({ standings, pointsToWin, totalMatchesPlayed }: TeamLeaderboardProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (standings.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No matches completed yet</p>
      </div>
    )
  }

  const maxPoints = Math.max(...standings.map(s => s.totalPoints), 1)

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-white font-semibold">Team Standings</h2>
        {pointsToWin && (
          <p className="text-slate-500 text-xs" style={monoFont}>{pointsToWin} points to win</p>
        )}
      </div>

      <div className="divide-y divide-slate-800/50">
        {standings.map((team, idx) => (
          <div key={team.teamId} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 text-sm w-4" style={monoFont}>{idx + 1}</span>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.teamColor }} />
                <div>
                  <span className="text-white font-medium">{team.teamName}</span>
                  {team.isDefendingChampion && (
                    <span className="text-amber-400 text-xs ml-2" style={monoFont}>DEF. CHAMP</span>
                  )}
                </div>
              </div>
              <span className="text-2xl font-bold text-white" style={monoFont}>{team.totalPoints}</span>
            </div>

            {/* Points bar */}
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(team.totalPoints / (pointsToWin || maxPoints)) * 100}%`,
                  backgroundColor: team.teamColor,
                }}
              />
            </div>

            {/* Record */}
            <div className="flex items-center gap-3 text-xs text-slate-500" style={monoFont}>
              <span>{team.matchesWon}W</span>
              <span>{team.matchesLost}L</span>
              <span>{team.matchesHalved}H</span>

              {/* Round breakdown */}
              {team.roundBreakdown.length > 0 && (
                <div className="flex items-center gap-1 ml-auto">
                  {team.roundBreakdown.map(r => (
                    <span
                      key={r.roundId}
                      className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400"
                      title={`Round ${r.roundNumber}: ${r.points} pts`}
                    >
                      R{r.roundNumber}: {r.points}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
