'use client'

import { MatchState } from '@/lib/golf'

interface HoleData {
  number: number
  par: number
  yardage: number
  handicap: number
}

interface ScorecardPlayer {
  id: string
  name: string
  playingHandicap: number
  strokeHoles: number[]  // Hole numbers where player receives a stroke
  scores: (number | null)[]   // Gross scores, 18 values
  netScores: (number | null)[] // Net scores, 18 values
}

interface ScorecardSide {
  name: string
  color: string
  players: ScorecardPlayer[]
  bestBall?: (number | null)[] // Best ball per hole (for FOURBALL/SHAMBLE)
}

interface ScorecardProps {
  courseName: string
  teeName: string
  holes: HoleData[]
  side1: ScorecardSide
  side2: ScorecardSide
  format: string
  matchState?: MatchState | null
  showBestBall?: boolean
}

export default function Scorecard({
  courseName,
  teeName,
  holes,
  side1,
  side2,
  format,
  matchState,
  showBestBall = false,
}: ScorecardProps) {
  const front9 = holes.filter(h => h.number <= 9)
  const back9 = holes.filter(h => h.number > 9)

  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  function scoreColor(score: number | null, par: number): string {
    if (score === null) return 'text-slate-600'
    const diff = score - par
    if (diff <= -2) return 'text-yellow-400'   // Eagle or better
    if (diff === -1) return 'text-emerald-400'  // Birdie
    if (diff === 0) return 'text-slate-300'     // Par
    if (diff === 1) return 'text-red-400'       // Bogey
    return 'text-red-500'                       // Double+
  }

  function scoreBg(score: number | null, par: number): string {
    if (score === null) return ''
    const diff = score - par
    if (diff <= -2) return 'bg-yellow-500/10 rounded'
    if (diff === -1) return 'bg-emerald-500/10 rounded'
    return ''
  }

  function renderNineHoles(nineHoles: HoleData[], label: string) {
    const startIdx = nineHoles[0]?.number === 1 ? 0 : 9
    const totalPar = nineHoles.reduce((sum, h) => sum + h.par, 0)

    return (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs" style={monoFont}>
          <thead>
            {/* Hole numbers */}
            <tr className="border-b border-slate-700">
              <th className="text-left py-1 px-2 text-slate-500 w-24">{label}</th>
              {nineHoles.map(h => (
                <th key={h.number} className="text-center py-1 px-1 text-slate-400 min-w-[28px]">
                  {h.number}
                </th>
              ))}
              <th className="text-center py-1 px-2 text-slate-400">TOT</th>
            </tr>
            {/* Par */}
            <tr className="border-b border-slate-800">
              <td className="py-1 px-2 text-slate-500">Par</td>
              {nineHoles.map(h => (
                <td key={h.number} className="text-center py-1 px-1 text-slate-500">{h.par}</td>
              ))}
              <td className="text-center py-1 px-2 text-slate-500">{totalPar}</td>
            </tr>
          </thead>
          <tbody>
            {/* Side 1 players */}
            {side1.players.map(player => {
              const nineScores = nineHoles.map(h => player.scores[h.number - 1])
              const total = nineScores.reduce((sum: number, s) => sum + (s ?? 0), 0)
              const hasScores = nineScores.some(s => s !== null)

              return (
                <tr key={player.id} className="border-b border-slate-800/50">
                  <td className="py-1 px-2 truncate max-w-[96px]">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: side1.color }} />
                    <span className="text-slate-300">{player.name.split(' ')[0]}</span>
                  </td>
                  {nineHoles.map(h => {
                    const score = player.scores[h.number - 1]
                    const isStrokeHole = player.strokeHoles.includes(h.number)
                    return (
                      <td key={h.number} className={`text-center py-1 px-1 ${scoreColor(score, h.par)} ${scoreBg(score, h.par)}`}>
                        {score ?? '-'}
                        {isStrokeHole && score !== null && <span className="text-amber-400 text-[8px] align-super">●</span>}
                      </td>
                    )
                  })}
                  <td className="text-center py-1 px-2 text-slate-300 font-semibold">
                    {hasScores ? total : '-'}
                  </td>
                </tr>
              )
            })}

            {/* Side 1 best ball */}
            {showBestBall && side1.bestBall && (
              <tr className="border-b border-slate-700">
                <td className="py-1 px-2 text-slate-500 italic">Best Ball</td>
                {nineHoles.map(h => {
                  const bb = side1.bestBall![h.number - 1]
                  return (
                    <td key={h.number} className={`text-center py-1 px-1 font-semibold ${scoreColor(bb, h.par)}`}>
                      {bb ?? '-'}
                    </td>
                  )
                })}
                <td className="text-center py-1 px-2 font-semibold text-slate-300">
                  {nineHoles.reduce((s, h) => s + (side1.bestBall![h.number - 1] ?? 0), 0) || '-'}
                </td>
              </tr>
            )}

            {/* Side 2 players */}
            {side2.players.map(player => {
              const nineScores = nineHoles.map(h => player.scores[h.number - 1])
              const total = nineScores.reduce((sum: number, s) => sum + (s ?? 0), 0)
              const hasScores = nineScores.some(s => s !== null)

              return (
                <tr key={player.id} className="border-b border-slate-800/50">
                  <td className="py-1 px-2 truncate max-w-[96px]">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: side2.color }} />
                    <span className="text-slate-300">{player.name.split(' ')[0]}</span>
                  </td>
                  {nineHoles.map(h => {
                    const score = player.scores[h.number - 1]
                    const isStrokeHole = player.strokeHoles.includes(h.number)
                    return (
                      <td key={h.number} className={`text-center py-1 px-1 ${scoreColor(score, h.par)} ${scoreBg(score, h.par)}`}>
                        {score ?? '-'}
                        {isStrokeHole && score !== null && <span className="text-amber-400 text-[8px] align-super">●</span>}
                      </td>
                    )
                  })}
                  <td className="text-center py-1 px-2 text-slate-300 font-semibold">
                    {hasScores ? total : '-'}
                  </td>
                </tr>
              )
            })}

            {/* Side 2 best ball */}
            {showBestBall && side2.bestBall && (
              <tr className="border-b border-slate-700">
                <td className="py-1 px-2 text-slate-500 italic">Best Ball</td>
                {nineHoles.map(h => {
                  const bb = side2.bestBall![h.number - 1]
                  return (
                    <td key={h.number} className={`text-center py-1 px-1 font-semibold ${scoreColor(bb, h.par)}`}>
                      {bb ?? '-'}
                    </td>
                  )
                })}
                <td className="text-center py-1 px-2 font-semibold text-slate-300">
                  {nineHoles.reduce((s, h) => s + (side2.bestBall![h.number - 1] ?? 0), 0) || '-'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">{courseName}</h3>
            <p className="text-slate-500 text-xs" style={monoFont}>{teeName} tees &middot; {format.replace(/_/g, ' ')}</p>
          </div>
          {matchState && matchState.resultText && (
            <div className="text-right">
              <span className="text-white font-bold text-sm" style={monoFont}>{matchState.resultText}</span>
              <p className="text-emerald-400 text-xs">FINAL</p>
            </div>
          )}
          {matchState && !matchState.isComplete && matchState.holesPlayed > 0 && (
            <div className="text-right">
              <span className="text-white font-bold text-sm" style={monoFont}>{matchState.displayText}</span>
              <p className="text-slate-500 text-xs">thru {matchState.holesPlayed}</p>
            </div>
          )}
        </div>
      </div>

      {/* Front 9 */}
      <div className="px-2 pt-2">
        {renderNineHoles(front9, 'OUT')}
      </div>

      {/* Back 9 */}
      {back9.length > 0 && (
        <div className="px-2">
          {renderNineHoles(back9, 'IN')}
        </div>
      )}
    </div>
  )
}
