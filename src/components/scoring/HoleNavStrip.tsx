'use client'

interface HoleNavStripProps {
  totalHoles: number
  currentHole: number
  scoredHoles: Set<number>  // Set of hole numbers that have scores
  onHoleSelect: (holeNumber: number) => void
}

export default function HoleNavStrip({ totalHoles, currentHole, scoredHoles, onHoleSelect }: HoleNavStripProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto py-2 px-1 scrollbar-hide">
      {Array.from({ length: totalHoles }, (_, i) => {
        const holeNum = i + 1
        const isScored = scoredHoles.has(holeNum)
        const isCurrent = holeNum === currentHole

        return (
          <button
            key={holeNum}
            onClick={() => onHoleSelect(holeNum)}
            className={`
              flex-shrink-0 w-9 h-9 rounded-full text-sm font-medium
              transition-all duration-150
              ${isCurrent
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 scale-110'
                : isScored
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-600'
              }
            `}
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            {holeNum}
          </button>
        )
      })}
    </div>
  )
}
