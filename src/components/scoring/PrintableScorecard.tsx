import { strokeAllocation, receivesDoubleStroke } from '@/lib/golf'
import type { HoleInfo } from '@/lib/golf'

interface HoleData {
  number: number
  par: number
  yardage: number
  handicap: number
}

interface PlayerData {
  name: string
  teamName: string
  teamColor: string
  side: number
  playingHandicap: number
  strokeHoles: number[]
}

interface PrintableScorecardProps {
  courseName: string
  teeName: string
  teeColor: string
  roundName: string
  date: string | null
  format: string
  matchNumber: number
  maxScore: number | null
  holes: HoleData[]
  players: PlayerData[]
  showBestBall: boolean
}

export default function PrintableScorecard({
  courseName,
  teeName,
  teeColor,
  roundName,
  date,
  format,
  matchNumber,
  maxScore,
  holes,
  players,
  showBestBall,
}: PrintableScorecardProps) {
  const front9 = holes.filter(h => h.number <= 9)
  const back9 = holes.filter(h => h.number > 9)
  const side1Players = players.filter(p => p.side === 1)
  const side2Players = players.filter(p => p.side === 2)

  const formatLabel = format.replace(/_/g, ' ')
  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  function renderNine(nineHoles: HoleData[], label: string) {
    const totalPar = nineHoles.reduce((s, h) => s + h.par, 0)
    const totalYards = nineHoles.reduce((s, h) => s + h.yardage, 0)

    return (
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '4px' }}>
        <thead>
          {/* Hole numbers */}
          <tr className="header-row">
            <th className="label-cell" style={{ background: '#222', color: 'white', textAlign: 'left', padding: '3px 6px', border: '1px solid #333', width: '120px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              {label}
            </th>
            {nineHoles.map(h => (
              <th key={h.number} style={{ background: '#222', color: 'white', padding: '3px 4px', border: '1px solid #333', fontSize: '11px', fontWeight: 'bold', minWidth: '30px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                {h.number}
              </th>
            ))}
            <th style={{ background: '#222', color: 'white', padding: '3px 6px', border: '1px solid #333', fontSize: '11px', fontWeight: 'bold', minWidth: '36px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              TOT
            </th>
          </tr>
          {/* Yardage */}
          <tr>
            <td style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', color: '#666' }}>Yards</td>
            {nineHoles.map(h => (
              <td key={h.number} style={{ padding: '2px 4px', border: '1px solid #999', fontSize: '9px', color: '#666', textAlign: 'center' }}>
                {h.yardage}
              </td>
            ))}
            <td style={{ padding: '2px 4px', border: '1px solid #999', fontSize: '9px', color: '#666', textAlign: 'center', fontWeight: 'bold' }}>
              {totalYards}
            </td>
          </tr>
          {/* Par */}
          <tr className="par-row">
            <td style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '10px', fontWeight: 'bold' }}>Par</td>
            {nineHoles.map(h => (
              <td key={h.number} style={{ padding: '2px 4px', border: '1px solid #999', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>
                {h.par}
              </td>
            ))}
            <td style={{ padding: '2px 4px', border: '1px solid #999', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' }}>
              {totalPar}
            </td>
          </tr>
          {/* Stroke Index */}
          <tr>
            <td style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', color: '#666' }}>SI</td>
            {nineHoles.map(h => (
              <td key={h.number} style={{ padding: '2px 4px', border: '1px solid #999', fontSize: '9px', color: '#666', textAlign: 'center' }}>
                {h.handicap}
              </td>
            ))}
            <td style={{ border: '1px solid #999' }}></td>
          </tr>
        </thead>
        <tbody>
          {/* Side 1 players */}
          {side1Players.map((player, idx) => (
            <tr key={`s1-${idx}`}>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px',
                  backgroundColor: player.teamColor, marginRight: '4px', verticalAlign: 'middle',
                  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                } as React.CSSProperties} />
                {player.name} ({player.playingHandicap})
              </td>
              {nineHoles.map(h => {
                const hasStroke = player.strokeHoles.includes(h.number)
                const hasDouble = receivesDoubleStroke(player.playingHandicap, h.handicap)
                return (
                  <td key={h.number} className="score-cell" style={{ border: '1px solid #999', height: '26px', minWidth: '30px', position: 'relative', textAlign: 'center', fontSize: '9px' }}>
                    {hasDouble ? '●●' : hasStroke ? '●' : ''}
                  </td>
                )
              })}
              <td style={{ border: '1px solid #999', height: '26px', minWidth: '36px' }}></td>
            </tr>
          ))}

          {/* Best ball row for side 1 */}
          {showBestBall && (
            <tr>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontStyle: 'italic', color: '#666' }}>
                Best Ball
              </td>
              {nineHoles.map(h => (
                <td key={h.number} className="score-cell" style={{ border: '1px solid #999', height: '22px' }}></td>
              ))}
              <td style={{ border: '1px solid #999', height: '22px' }}></td>
            </tr>
          )}

          {/* Separator between sides */}
          <tr className="separator-row">
            <td colSpan={nineHoles.length + 2} style={{ borderTop: '2.5px solid #000', height: '0', padding: '0', border: '1px solid #999' }}></td>
          </tr>

          {/* Side 2 players */}
          {side2Players.map((player, idx) => (
            <tr key={`s2-${idx}`}>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px',
                  backgroundColor: player.teamColor, marginRight: '4px', verticalAlign: 'middle',
                  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                } as React.CSSProperties} />
                {player.name} ({player.playingHandicap})
              </td>
              {nineHoles.map(h => {
                const hasStroke = player.strokeHoles.includes(h.number)
                const hasDouble = receivesDoubleStroke(player.playingHandicap, h.handicap)
                return (
                  <td key={h.number} className="score-cell" style={{ border: '1px solid #999', height: '26px', minWidth: '30px', position: 'relative', textAlign: 'center', fontSize: '9px' }}>
                    {hasDouble ? '●●' : hasStroke ? '●' : ''}
                  </td>
                )
              })}
              <td style={{ border: '1px solid #999', height: '26px', minWidth: '36px' }}></td>
            </tr>
          ))}

          {/* Best ball row for side 2 */}
          {showBestBall && (
            <tr>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontStyle: 'italic', color: '#666' }}>
                Best Ball
              </td>
              {nineHoles.map(h => (
                <td key={h.number} className="score-cell" style={{ border: '1px solid #999', height: '22px' }}></td>
              ))}
              <td style={{ border: '1px solid #999', height: '22px' }}></td>
            </tr>
          )}

          {/* Match row */}
          <tr>
            <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontWeight: 'bold' }}>
              Match
            </td>
            {nineHoles.map(h => (
              <td key={h.number} className="score-cell" style={{ border: '1px solid #999', height: '22px' }}></td>
            ))}
            <td style={{ border: '1px solid #999', height: '22px' }}></td>
          </tr>
        </tbody>
      </table>
    )
  }

  return (
    <div className="print-scorecard" style={{ background: 'white', color: 'black', padding: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{courseName}</h2>
          <p style={{ fontSize: '11px', margin: '0', color: '#444' }}>
            <span style={{
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: teeColor, marginRight: '4px', verticalAlign: 'middle',
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            } as React.CSSProperties} />
            {teeName} Tees &bull; {formatLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>Match {matchNumber}</p>
          <p style={{ fontSize: '10px', margin: '0', color: '#444' }}>
            {roundName}{dateStr ? ` — ${dateStr}` : ''}
          </p>
        </div>
      </div>

      {/* Front 9 */}
      {renderNine(front9, 'OUT')}

      {/* Back 9 */}
      {back9.length > 0 && renderNine(back9, 'IN')}

      {/* Totals summary */}
      <table style={{ borderCollapse: 'collapse', width: 'auto', marginTop: '4px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', width: '120px', background: '#eee', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              TOTAL
            </th>
            <th style={{ padding: '2px 8px', border: '1px solid #999', fontSize: '9px', minWidth: '40px', background: '#eee', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>OUT</th>
            <th style={{ padding: '2px 8px', border: '1px solid #999', fontSize: '9px', minWidth: '40px', background: '#eee', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>IN</th>
            <th style={{ padding: '2px 8px', border: '1px solid #999', fontSize: '9px', minWidth: '40px', background: '#eee', fontWeight: 'bold', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>TOT</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', whiteSpace: 'nowrap' }}>
                <span style={{
                  display: 'inline-block', width: '6px', height: '6px', borderRadius: '1px',
                  backgroundColor: player.teamColor, marginRight: '3px', verticalAlign: 'middle',
                  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                } as React.CSSProperties} />
                {player.name}
              </td>
              <td style={{ border: '1px solid #999', height: '22px', minWidth: '40px' }}></td>
              <td style={{ border: '1px solid #999', height: '22px', minWidth: '40px' }}></td>
              <td style={{ border: '1px solid #999', height: '22px', minWidth: '40px' }}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '8px', fontSize: '9px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
        <span>● = stroke received &nbsp; ●● = double stroke</span>
        <span>
          {maxScore ? `Max score: par + ${maxScore}` : ''}
          {maxScore ? ' · ' : ''}
          Result: _______________
        </span>
      </div>
    </div>
  )
}
