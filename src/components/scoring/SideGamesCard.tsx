'use client'

interface SideGame {
  id: string
  type: 'CLOSEST_PIN' | 'LONGEST_DRIVE' | 'LONGEST_PUTT'
  measurement: number | null
  unit: 'FEET' | 'YARDS' | 'INCHES'
  hole: { number: number; par: number }
  winner: {
    id: string
    user: { name: string }
    team: { name: string; color: string } | null
  } | null
}

interface SideGamesCardProps {
  sideGames: SideGame[]
  isOrganizer?: boolean
  onDelete?: (id: string) => void
}

const typeLabels: Record<string, string> = {
  CLOSEST_PIN: 'Closest to Pin',
  LONGEST_DRIVE: 'Longest Drive',
  LONGEST_PUTT: 'Longest Putt',
}

const typeIcons: Record<string, string> = {
  CLOSEST_PIN: '\uD83C\uDFAF',
  LONGEST_DRIVE: '\uD83C\uDFCC',
  LONGEST_PUTT: '\u26F3',
}

export default function SideGamesCard({ sideGames, isOrganizer, onDelete }: SideGamesCardProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  if (sideGames.length === 0) return null

  const grouped = {
    CLOSEST_PIN: sideGames.filter(g => g.type === 'CLOSEST_PIN'),
    LONGEST_DRIVE: sideGames.filter(g => g.type === 'LONGEST_DRIVE'),
    LONGEST_PUTT: sideGames.filter(g => g.type === 'LONGEST_PUTT'),
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-white font-semibold">Side Games</h3>
      </div>

      <div className="divide-y divide-slate-800/30">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map(type => {
          const games = grouped[type]
          if (games.length === 0) return null

          return (
            <div key={type} className="px-4 py-2.5">
              <p className="text-xs text-slate-500 mb-1.5" style={monoFont}>
                {typeLabels[type]}
              </p>
              <div className="space-y-1">
                {games.map(game => (
                  <div key={game.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-14" style={monoFont}>
                        Hole {game.hole.number}
                      </span>
                      {game.winner ? (
                        <div className="flex items-center gap-1.5">
                          {game.winner.team && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: game.winner.team.color }} />
                          )}
                          <span className="text-white font-medium">{game.winner.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">No winner yet</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {game.measurement && (
                        <span className="text-emerald-400 text-xs" style={monoFont}>
                          {game.measurement} {game.unit.toLowerCase()}
                        </span>
                      )}
                      {isOrganizer && onDelete && (
                        <button
                          onClick={() => onDelete(game.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                          style={monoFont}
                        >
                          x
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
