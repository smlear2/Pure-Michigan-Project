'use client'

interface ScoreInputProps {
  playerName: string
  teamColor: string | null
  teamName: string | null
  par: number
  strokeReceived: boolean
  currentScore: number | null
  maxScore: number | null  // null = no cap
  onScore: (score: number) => void
}

export default function ScoreInput({
  playerName,
  teamColor,
  teamName,
  par,
  strokeReceived,
  currentScore,
  maxScore,
  onScore,
}: ScoreInputProps) {
  // Score buttons range: 1 to par+4 (or maxScore cap)
  const maxButton = maxScore ? Math.min(par + maxScore, par + 5) : par + 5
  const minButton = 1
  const buttons = Array.from({ length: maxButton - minButton + 1 }, (_, i) => minButton + i)

  return (
    <div className="py-3">
      {/* Player info row */}
      <div className="flex items-center gap-2 mb-2 px-1">
        {teamColor && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: teamColor }}
          />
        )}
        <span className="text-sm font-medium text-white truncate">{playerName}</span>
        {strokeReceived && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
            ●
          </span>
        )}
        {teamName && (
          <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{teamName}</span>
        )}
      </div>

      {/* Score buttons */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {buttons.map(score => {
          const isSelected = currentScore === score
          const isUnderPar = score < par
          const isPar = score === par
          const isOverPar = score > par

          // Size: par-range buttons are bigger
          const isInRange = score >= par - 1 && score <= par + 2
          const sizeClass = isInRange ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base'

          let colorClass: string
          if (isSelected) {
            if (isUnderPar) colorClass = 'bg-emerald-500 text-white ring-2 ring-emerald-300'
            else if (isPar) colorClass = 'bg-blue-500 text-white ring-2 ring-blue-300'
            else colorClass = 'bg-red-500 text-white ring-2 ring-red-300'
          } else {
            if (isUnderPar) colorClass = 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
            else if (isPar) colorClass = 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
            else colorClass = 'bg-red-900/40 text-red-400 border border-red-700/50'
          }

          return (
            <button
              key={score}
              onClick={() => onScore(score)}
              className={`
                flex-shrink-0 rounded-xl font-bold
                transition-all duration-100 active:scale-95
                ${sizeClass} ${colorClass}
              `}
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {score}
            </button>
          )
        })}
      </div>
    </div>
  )
}
