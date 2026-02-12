import { strokeAllocation } from '@/lib/golf'
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
  courseHandicap: number
  playingHandicap: number
  handicapIndex: number
  strokeHoles: number[] // holes where this player gets a *
}

interface PrintableScorecardProps {
  tournamentName: string
  year: number
  courseName: string
  teeName: string
  teeColor: string
  teeRating: number
  teeSlope: number
  roundName: string
  roundNumber: number
  date: string | null
  format: string
  matchNumber: number
  holes: HoleData[]
  players: PlayerData[]
  showBestBall: boolean
  localRules?: string
}

const FORMAT_LABELS: Record<string, string> = {
  FOURBALL: 'Fourball',
  FOURSOMES: 'Foursomes',
  SCRAMBLE: '2-Man Scramble',
  SINGLES: 'Singles',
}

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  FOURBALL: '(Best of 2)',
  FOURSOMES: '(Mod. Alternate Shot)',
  SCRAMBLE: '(Scramble)',
  SINGLES: '(Match Play)',
}

// Shared cell style constants
const borderStyle = '1px solid #999'
const headerBg = { background: '#222', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties
const cellBase = { border: borderStyle, textAlign: 'center' as const, fontSize: '9px', padding: '2px 3px' }
const holeCellStyle = { ...cellBase, minWidth: '28px' }
const totalCellStyle = { ...cellBase, minWidth: '32px', fontWeight: 'bold' as const }
const spacerStyle = { width: '4px', border: 'none', padding: 0 }
const labelStyle = { ...cellBase, textAlign: 'left' as const, padding: '2px 4px', fontSize: '9px', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const }
const scoreCellStyle = { ...holeCellStyle, height: '26px' }
const emptyCellStyle = { ...holeCellStyle, height: '22px' }

export default function PrintableScorecard({
  tournamentName,
  year,
  courseName,
  teeName,
  teeRating,
  teeSlope,
  roundName,
  roundNumber,
  date,
  format,
  matchNumber,
  holes,
  players,
  showBestBall,
  localRules,
}: PrintableScorecardProps) {
  const front9 = holes.filter(h => h.number <= 9)
  const back9 = holes.filter(h => h.number > 9)
  const side1 = players.filter(p => p.side === 1)
  const side2 = players.filter(p => p.side === 2)
  const isTeamFormat = format === 'FOURSOMES' || format === 'SCRAMBLE'

  const frontPar = front9.reduce((s, h) => s + h.par, 0)
  const backPar = back9.reduce((s, h) => s + h.par, 0)
  const totalPar = frontPar + backPar
  const frontYards = front9.reduce((s, h) => s + h.yardage, 0)
  const backYards = back9.reduce((s, h) => s + h.yardage, 0)
  const totalYards = frontYards + backYards

  const formatLabel = FORMAT_LABELS[format] || format
  const formatDesc = FORMAT_DESCRIPTIONS[format] || ''

  // Compute strokes for display
  // Individual formats: courseHandicap off-the-low (full strokes, no percentage)
  // Team formats: playingHandicap (already has combo + off-the-low)
  function getDisplayStrokes(player: PlayerData): number {
    if (isTeamFormat) {
      return player.playingHandicap
    }
    const minCourseHcp = Math.min(...players.map(p => p.courseHandicap))
    return Math.max(0, player.courseHandicap - minCourseHcp)
  }

  function renderPlayerRow(player: PlayerData, showStrokes: boolean) {
    const strokes = getDisplayStrokes(player)
    return (
      <tr key={`player-${player.name}`}>
        <td style={{ ...labelStyle, width: '130px' }}>{player.name}</td>
        <td style={{ ...cellBase, fontSize: '9px', width: '30px' }}>({player.courseHandicap})</td>
        <td style={{ ...cellBase, fontSize: '9px', width: '22px' }}>
          {showStrokes && strokes > 0 ? strokes : showStrokes ? 0 : ''}
        </td>
        {front9.map(h => (
          <td key={h.number} style={scoreCellStyle}>
            {showStrokes && player.strokeHoles.includes(h.number) ? '*' : ''}
          </td>
        ))}
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
        <td style={spacerStyle}></td>
        {back9.map(h => (
          <td key={h.number} style={scoreCellStyle}>
            {showStrokes && player.strokeHoles.includes(h.number) ? '*' : ''}
          </td>
        ))}
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
      </tr>
    )
  }

  function renderBlankRow(key: string) {
    return (
      <tr key={key}>
        <td style={{ ...labelStyle, width: '130px' }}></td>
        <td style={cellBase}></td>
        <td style={cellBase}></td>
        {front9.map(h => (
          <td key={h.number} style={scoreCellStyle}></td>
        ))}
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
        <td style={spacerStyle}></td>
        {back9.map(h => (
          <td key={h.number} style={scoreCellStyle}></td>
        ))}
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
        <td style={{ ...totalCellStyle, height: '26px' }}></td>
      </tr>
    )
  }

  function renderLabelRow(label: string, key: string) {
    return (
      <tr key={key}>
        <td style={labelStyle}>{label}</td>
        <td style={cellBase}></td>
        <td style={cellBase}></td>
        {front9.map(h => (
          <td key={h.number} style={emptyCellStyle}></td>
        ))}
        <td style={{ ...totalCellStyle, height: '22px' }}></td>
        <td style={spacerStyle}></td>
        {back9.map(h => (
          <td key={h.number} style={emptyCellStyle}></td>
        ))}
        <td style={{ ...totalCellStyle, height: '22px' }}></td>
        <td style={{ ...totalCellStyle, height: '22px' }}></td>
      </tr>
    )
  }

  function renderSideRows(sidePlayers: PlayerData[], sideKey: string) {
    const rows: React.ReactNode[] = []

    sidePlayers.forEach((player, idx) => {
      // For team formats, only show strokes/marks on the FIRST player
      const showStrokes = !isTeamFormat || idx === 0
      rows.push(renderPlayerRow(player, showStrokes))
    })

    // Best ball net and +/- rows
    if (showBestBall) {
      rows.push(renderLabelRow('BEST BALL (NET)', `${sideKey}-bb`))
    }
    rows.push(renderLabelRow('+/\u2212', `${sideKey}-pm`))

    return rows
  }

  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div className="print-scorecard" style={{ background: 'white', color: 'black', padding: '10px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Scorecard Grid */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '130px' }} />
          <col style={{ width: '30px' }} />
          <col style={{ width: '22px' }} />
          {front9.map(h => <col key={`f${h.number}`} style={{ width: '28px' }} />)}
          <col style={{ width: '32px' }} />
          <col style={{ width: '4px' }} />
          {back9.map(h => <col key={`b${h.number}`} style={{ width: '28px' }} />)}
          <col style={{ width: '32px' }} />
          <col style={{ width: '36px' }} />
        </colgroup>
        <thead>
          {/* Title row */}
          <tr>
            <td colSpan={3 + front9.length + 1 + 1 + back9.length + 1 + 1} style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px', border: 'none' }}>
              {tournamentName} - {year} - Round {roundNumber} - {courseName}
            </td>
          </tr>

          {/* FRONT / BACK labels */}
          <tr>
            <td colSpan={3} style={{ border: 'none' }}></td>
            <td colSpan={front9.length + 1} style={{ ...headerBg, border: borderStyle, textAlign: 'center', fontSize: '10px', fontWeight: 'bold', padding: '2px' }}>
              FRONT
            </td>
            <td style={spacerStyle}></td>
            <td colSpan={back9.length + 1 + 1} style={{ ...headerBg, border: borderStyle, textAlign: 'center', fontSize: '10px', fontWeight: 'bold', padding: '2px' }}>
              BACK
            </td>
          </tr>

          {/* HOLE numbers */}
          <tr>
            <td style={{ ...labelStyle, ...headerBg, border: borderStyle }}></td>
            <td colSpan={2} style={{ ...cellBase, ...headerBg, border: borderStyle, fontSize: '9px', fontWeight: 'bold' }}>HOLE</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, ...headerBg, border: borderStyle, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={{ ...totalCellStyle, ...headerBg, border: borderStyle }}>OUT</td>
            <td style={spacerStyle}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, ...headerBg, border: borderStyle, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={{ ...totalCellStyle, ...headerBg, border: borderStyle }}>IN</td>
            <td style={{ ...totalCellStyle, ...headerBg, border: borderStyle }}>TOTAL</td>
          </tr>

          {/* TEES row */}
          <tr>
            <td style={{ ...labelStyle, fontSize: '9px' }}>{formatLabel}</td>
            <td colSpan={2} style={{ ...cellBase, fontSize: '9px', fontWeight: 'bold' }}>TEES</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '7px', color: '#666' }}>{teeName}</td>
            ))}
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
            <td style={spacerStyle}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '7px', color: '#666' }}>{teeName}</td>
            ))}
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
          </tr>

          {/* DISTANCE row */}
          <tr>
            <td style={labelStyle}></td>
            <td colSpan={2} style={{ ...cellBase, fontSize: '9px', color: '#666' }}>DISTANCE</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '8px', color: '#666' }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCellStyle, fontSize: '8px', color: '#666' }}>{frontYards}</td>
            <td style={spacerStyle}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '8px', color: '#666' }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCellStyle, fontSize: '8px', color: '#666' }}>{backYards}</td>
            <td style={{ ...totalCellStyle, fontSize: '8px', color: '#666' }}>{totalYards}</td>
          </tr>

          {/* PAR row */}
          <tr className="par-row">
            <td style={{ ...labelStyle, fontSize: '8px', color: '#666' }}>{formatDesc}</td>
            <td colSpan={2} style={{ ...cellBase, fontSize: '10px', fontWeight: 'bold' }}>PAR</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '10px', fontWeight: 'bold' }}>{h.par}</td>
            ))}
            <td style={{ ...totalCellStyle, fontSize: '10px' }}>{frontPar}</td>
            <td style={spacerStyle}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '10px', fontWeight: 'bold' }}>{h.par}</td>
            ))}
            <td style={{ ...totalCellStyle, fontSize: '10px' }}>{backPar}</td>
            <td style={{ ...totalCellStyle, fontSize: '10px' }}>{totalPar}</td>
          </tr>

          {/* HDCP row */}
          <tr>
            <td style={labelStyle}></td>
            <td colSpan={2} style={{ ...cellBase, fontSize: '9px', color: '#666' }}>HDCP</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '8px', color: '#666' }}>{h.handicap}</td>
            ))}
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
            <td style={spacerStyle}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCellStyle, fontSize: '8px', color: '#666' }}>{h.handicap}</td>
            ))}
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
            <td style={{ ...totalCellStyle, border: borderStyle }}></td>
          </tr>
        </thead>

        <tbody>
          {/* Side 1 */}
          {renderSideRows(side1, 's1')}

          {/* Side 2 */}
          {renderSideRows(side2, 's2')}
        </tbody>
      </table>

      {/* Info Section */}
      <div style={{ marginTop: '12px', fontSize: '10px', lineHeight: '1.6' }}>
        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
          {tournamentName} - {year} - Round {roundNumber} - {courseName} - Par {totalPar}
        </div>

        <div style={{ marginBottom: '2px' }}>
          Game {matchNumber}{dateStr ? ` \u2014 ${dateStr}` : ''}
        </div>

        {/* Team lineups */}
        <div style={{ marginBottom: '2px' }}>
          {side1[0]?.teamName || 'Side 1'} - {side1.map(p => `${p.name} (${p.handicapIndex})`).join(' & ')}
        </div>
        <div style={{ marginBottom: '6px' }}>
          {side2[0]?.teamName || 'Side 2'} - {side2.map(p => `${p.name} (${p.handicapIndex})`).join(' & ')}
        </div>

        <table style={{ fontSize: '10px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ paddingRight: '8px', verticalAlign: 'top' }}>Format:</td>
              <td>{formatLabel}</td>
              <td style={{ paddingLeft: '24px' }}>{formatDesc}</td>
            </tr>
            <tr>
              <td style={{ paddingRight: '8px', verticalAlign: 'top' }}>Tees:</td>
              <td>{teeName}</td>
              <td style={{ paddingLeft: '24px' }}>{totalYards} Yards</td>
            </tr>
          </tbody>
        </table>

        {localRules && (
          <div style={{ marginTop: '6px', fontSize: '9px', color: '#444', whiteSpace: 'pre-line' }}>
            <span style={{ fontWeight: 'bold' }}>Other Rules:</span>
            {'\n'}{localRules}
          </div>
        )}
      </div>
    </div>
  )
}
