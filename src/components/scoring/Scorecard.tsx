'use client'

import { MatchState, holeWinner } from '@/lib/golf'

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

  function scoreIndicator(score: number, par: number): React.CSSProperties | undefined {
    const diff = score - par
    if (diff <= -2) return {
      width: '18px', height: '18px', borderRadius: '50%',
      border: '1px solid #facc15', outline: '1px solid #facc15', outlineOffset: '1.5px',
    }
    if (diff === -1) return {
      width: '18px', height: '18px', borderRadius: '50%',
      border: '1px solid #34d399',
    }
    if (diff === 1) return {
      width: '18px', height: '18px',
      border: '1px solid #f87171',
    }
    if (diff >= 2) return {
      width: '18px', height: '18px',
      border: '1px solid #ef4444', outline: '1px solid #ef4444', outlineOffset: '1.5px',
    }
    return undefined
  }

  // Running match status per hole (for non-STROKEPLAY)
  const runningMatchStatus = (() => {
    if (format === 'STROKEPLAY') return []
    const statuses: { text: string; sideColor: string | null }[] = []
    let lead = 0
    for (const h of holes) {
      let s1Net: number | null, s2Net: number | null
      if (showBestBall) {
        s1Net = side1.bestBall?.[h.number - 1] ?? null
        s2Net = side2.bestBall?.[h.number - 1] ?? null
      } else {
        s1Net = side1.players[0]?.netScores[h.number - 1] ?? null
        s2Net = side2.players[0]?.netScores[h.number - 1] ?? null
      }
      const result = holeWinner(s1Net, s2Net)
      if (result === null) {
        statuses.push({ text: '', sideColor: null })
      } else {
        if (result === 'SIDE1') lead++
        else if (result === 'SIDE2') lead--
        if (lead === 0) statuses.push({ text: 'AS', sideColor: null })
        else if (lead > 0) statuses.push({ text: `${lead}UP`, sideColor: side1.color })
        else statuses.push({ text: `${Math.abs(lead)}UP`, sideColor: side2.color })
      }
    }
    return statuses
  })()

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
                      <td key={h.number} className={`text-center py-1 px-1 ${scoreColor(score, h.par)}`}>
                        {score !== null ? (
                          <span className="inline-flex items-center justify-center" style={scoreIndicator(score, h.par)}>
                            {score}
                          </span>
                        ) : '-'}
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
                      <td key={h.number} className={`text-center py-1 px-1 ${scoreColor(score, h.par)}`}>
                        {score !== null ? (
                          <span className="inline-flex items-center justify-center" style={scoreIndicator(score, h.par)}>
                            {score}
                          </span>
                        ) : '-'}
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

            {/* Running match status */}
            {format !== 'STROKEPLAY' && runningMatchStatus.length > 0 && (
              <tr className="border-t border-slate-600">
                <td className="py-1 px-2 text-slate-400 font-semibold text-[10px]">Match</td>
                {nineHoles.map(h => {
                  const status = runningMatchStatus[h.number - 1]
                  return (
                    <td
                      key={h.number}
                      className={`text-center py-1 px-1 text-[10px] font-bold ${!status?.sideColor ? 'text-slate-400' : ''}`}
                      style={status?.sideColor ? { color: status.sideColor } : undefined}
                    >
                      {status?.text || ''}
                    </td>
                  )
                })}
                <td className="text-center py-1 px-2"></td>
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

      {/* 18-hole totals */}
      {back9.length > 0 && (
        <div className="px-2 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={monoFont}>
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-1 px-2 text-slate-500 w-24">TOTAL</th>
                  <th className="text-center py-1 px-2 text-slate-400">OUT</th>
                  <th className="text-center py-1 px-2 text-slate-400">IN</th>
                  <th className="text-center py-1 px-2 text-slate-400">TOT</th>
                </tr>
              </thead>
              <tbody>
                {side1.players.map(player => {
                  const outTotal = front9.reduce((s, h) => s + (player.scores[h.number - 1] ?? 0), 0)
                  const inTotal = back9.reduce((s, h) => s + (player.scores[h.number - 1] ?? 0), 0)
                  const hasOut = front9.some(h => player.scores[h.number - 1] !== null)
                  const hasIn = back9.some(h => player.scores[h.number - 1] !== null)
                  return (
                    <tr key={player.id} className="border-b border-slate-800/50">
                      <td className="py-1 px-2 truncate max-w-[96px]">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: side1.color }} />
                        <span className="text-slate-300">{player.name.split(' ')[0]}</span>
                      </td>
                      <td className="text-center py-1 px-2 text-slate-400">{hasOut ? outTotal : '-'}</td>
                      <td className="text-center py-1 px-2 text-slate-400">{hasIn ? inTotal : '-'}</td>
                      <td className="text-center py-1 px-2 text-white font-semibold">{hasOut || hasIn ? outTotal + inTotal : '-'}</td>
                    </tr>
                  )
                })}
                {showBestBall && side1.bestBall && (
                  <tr className="border-b border-slate-700">
                    <td className="py-1 px-2 text-slate-500 italic">Best Ball</td>
                    <td className="text-center py-1 px-2 text-slate-400 font-semibold">
                      {front9.reduce((s, h) => s + (side1.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                    <td className="text-center py-1 px-2 text-slate-400 font-semibold">
                      {back9.reduce((s, h) => s + (side1.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                    <td className="text-center py-1 px-2 text-white font-semibold">
                      {holes.reduce((s, h) => s + (side1.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                  </tr>
                )}
                {side2.players.map(player => {
                  const outTotal = front9.reduce((s, h) => s + (player.scores[h.number - 1] ?? 0), 0)
                  const inTotal = back9.reduce((s, h) => s + (player.scores[h.number - 1] ?? 0), 0)
                  const hasOut = front9.some(h => player.scores[h.number - 1] !== null)
                  const hasIn = back9.some(h => player.scores[h.number - 1] !== null)
                  return (
                    <tr key={player.id} className="border-b border-slate-800/50">
                      <td className="py-1 px-2 truncate max-w-[96px]">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: side2.color }} />
                        <span className="text-slate-300">{player.name.split(' ')[0]}</span>
                      </td>
                      <td className="text-center py-1 px-2 text-slate-400">{hasOut ? outTotal : '-'}</td>
                      <td className="text-center py-1 px-2 text-slate-400">{hasIn ? inTotal : '-'}</td>
                      <td className="text-center py-1 px-2 text-white font-semibold">{hasOut || hasIn ? outTotal + inTotal : '-'}</td>
                    </tr>
                  )
                })}
                {showBestBall && side2.bestBall && (
                  <tr className="border-b border-slate-700">
                    <td className="py-1 px-2 text-slate-500 italic">Best Ball</td>
                    <td className="text-center py-1 px-2 text-slate-400 font-semibold">
                      {front9.reduce((s, h) => s + (side2.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                    <td className="text-center py-1 px-2 text-slate-400 font-semibold">
                      {back9.reduce((s, h) => s + (side2.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                    <td className="text-center py-1 px-2 text-white font-semibold">
                      {holes.reduce((s, h) => s + (side2.bestBall![h.number - 1] ?? 0), 0) || '-'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
