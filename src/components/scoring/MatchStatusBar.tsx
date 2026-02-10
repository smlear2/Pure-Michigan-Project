'use client'

import { MatchState } from '@/lib/golf'

interface MatchStatusBarProps {
  matchState: MatchState
  side1Name: string
  side1Color: string
  side2Name: string
  side2Color: string
  format: string
}

export default function MatchStatusBar({
  matchState,
  side1Name,
  side1Color,
  side2Name,
  side2Color,
  format,
}: MatchStatusBarProps) {
  const { side1Lead, holesPlayed, isComplete, isDormie, displayText, resultText } = matchState

  // Determine which side is winning for visual emphasis
  const leadingSide = side1Lead > 0 ? 1 : side1Lead < 0 ? 2 : 0
  const leadingColor = leadingSide === 1 ? side1Color : leadingSide === 2 ? side2Color : '#64748b'
  const leadingName = leadingSide === 1 ? side1Name : leadingSide === 2 ? side2Name : null

  const isStrokePlay = format === 'STROKEPLAY'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t border-slate-700/50"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
    >
      <div className="max-w-lg mx-auto px-4 py-3">
        {isStrokePlay ? (
          // Stroke play: just show holes played
          <div className="text-center">
            <p className="text-slate-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Stroke Play &middot; {holesPlayed} of 18 holes
            </p>
          </div>
        ) : isComplete ? (
          // Match complete
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: side1Color }} />
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                {resultText}
              </span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: side2Color }} />
            </div>
            <p className="text-emerald-400 text-xs mt-1">FINAL</p>
          </div>
        ) : (
          // In progress
          <div className="flex items-center justify-between">
            {/* Side 1 */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: side1Color }} />
              <span className="text-sm text-slate-300">{side1Name}</span>
            </div>

            {/* Status */}
            <div className="text-center">
              <p
                className="font-bold text-lg"
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  color: leadingColor,
                }}
              >
                {displayText}
              </p>
              <p className="text-slate-500 text-xs">
                thru {holesPlayed}
                {isDormie && ' · Dormie'}
              </p>
            </div>

            {/* Side 2 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">{side2Name}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: side2Color }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
