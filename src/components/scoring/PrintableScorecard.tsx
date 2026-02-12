import { receivesDoubleStroke } from '@/lib/golf'

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
  teeRating: number
  teeSlope: number
  roundName: string
  date: string | null
  format: string
  matchNumber: number
  maxScore: number | null
  holes: HoleData[]
  players: PlayerData[]
  showBestBall: boolean
  localRules?: string
}

export default function PrintableScorecard({
  courseName,
  teeName,
  teeColor,
  teeRating,
  teeSlope,
  roundName,
  date,
  format,
  matchNumber,
  maxScore,
  holes,
  players,
  showBestBall,
  localRules,
}: PrintableScorecardProps) {
  const front9 = holes.filter(h => h.number <= 9)
  const back9 = holes.filter(h => h.number > 9)
  const side1Players = players.filter(p => p.side === 1)
  const side2Players = players.filter(p => p.side === 2)

  const formatLabel = format.replace(/_/g, ' ')
  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const side1Names = side1Players.map(p => p.name).join(' / ')
  const side2Names = side2Players.map(p => p.name).join(' / ')

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
            <td style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', color: '#666' }}>Hdcp</td>
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
                    {hasDouble ? '**' : hasStroke ? '*' : ''}
                  </td>
                )
              })}
              <td style={{ border: '1px solid #999', height: '26px', minWidth: '36px' }}></td>
            </tr>
          ))}

          {/* Best ball net row for side 1 */}
          {showBestBall && (
            <tr>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontStyle: 'italic', color: '#666' }}>
                Best Ball Net
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
                    {hasDouble ? '**' : hasStroke ? '*' : ''}
                  </td>
                )
              })}
              <td style={{ border: '1px solid #999', height: '26px', minWidth: '36px' }}></td>
            </tr>
          ))}

          {/* Best ball net row for side 2 */}
          {showBestBall && (
            <tr>
              <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontStyle: 'italic', color: '#666' }}>
                Best Ball Net
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

          {/* +/- row */}
          <tr>
            <td className="label-cell" style={{ textAlign: 'left', padding: '2px 6px', border: '1px solid #999', fontSize: '9px', fontWeight: 'bold' }}>
              +/&minus;
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
            {roundName}{dateStr ? ` \u2014 ${dateStr}` : ''}
          </p>
        </div>
      </div>

      {/* Front 9 */}
      {renderNine(front9, 'OUT')}

      {/* Back 9 */}
      {back9.length > 0 && renderNine(back9, 'IN')}

      {/* Bottom info section */}
      <div style={{ marginTop: '8px', border: '1px solid #999', padding: '6px 8px', fontSize: '9px', color: '#333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span><strong>Format:</strong> {formatLabel}</span>
          <span><strong>Tees:</strong> {teeName} ({teeRating}/{teeSlope})</span>
        </div>
        <div style={{ marginBottom: '3px' }}>
          <strong>Match {matchNumber}:</strong> {side1Names} vs {side2Names}
        </div>
        <div style={{ marginBottom: '3px' }}>
          * = stroke received &nbsp;&nbsp; ** = double stroke
          {maxScore ? <span> &nbsp;&nbsp; Max score: par + {maxScore}</span> : null}
        </div>
        {localRules && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Local Rules:</strong> {localRules}
          </div>
        )}
        <div style={{ marginTop: '4px', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
          <strong>Result:</strong> _______________________________________________
        </div>
      </div>
    </div>
  )
}
