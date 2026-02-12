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

// Print color helper
const pca = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties
const bd = '2px solid #000'
const spacer = { width: '6px', border: 'none', padding: 0, background: 'white', ...pca } as React.CSSProperties

export default function PrintableScorecard({
  tournamentName,
  year,
  courseName,
  teeName,
  teeColor,
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
  const totalCols = 3 + front9.length + 1 + 1 + back9.length + 2

  const formatLabel = FORMAT_LABELS[format] || format
  const formatDesc = FORMAT_DESCRIPTIONS[format] || ''

  // Cell styles
  const holeCell: React.CSSProperties = { border: bd, textAlign: 'center', fontSize: '10px', padding: '1px 1px', minWidth: '28px' }
  const totalCell: React.CSSProperties = { ...holeCell, minWidth: '34px', fontWeight: 'bold' }
  const scoreCell: React.CSSProperties = { ...holeCell, height: '22px' }
  const labelCell: React.CSSProperties = { border: bd, textAlign: 'left', fontSize: '10px', padding: '1px 6px', whiteSpace: 'nowrap', overflow: 'hidden' }

  // Tee-colored cell for TEES row
  const teeCell: React.CSSProperties = { ...holeCell, background: teeColor, color: 'white', fontSize: '8px', ...pca }

  function getDisplayStrokes(player: PlayerData): number {
    if (isTeamFormat) return player.playingHandicap
    const minCourseHcp = Math.min(...players.map(p => p.courseHandicap))
    return Math.max(0, player.courseHandicap - minCourseHcp)
  }

  function renderPlayerRow(player: PlayerData, showStrokes: boolean, isFirst: boolean) {
    const strokes = getDisplayStrokes(player)
    const nameFontSize = '12px'
    const topBorder = bd

    return (
      <tr key={`player-${player.name}`}>
        <td style={{ ...labelCell, fontSize: nameFontSize, fontWeight: 'bold', borderTop: topBorder }}>
          {player.name}
        </td>
        <td style={{ ...holeCell, fontSize: '10px', borderTop: topBorder }}>({player.courseHandicap})</td>
        <td style={{ ...holeCell, fontSize: '11px', fontWeight: 'bold', borderTop: topBorder }}>
          {showStrokes ? strokes : ''}
        </td>
        {front9.map(h => (
          <td key={h.number} style={{ ...scoreCell, borderTop: topBorder }}>
            {showStrokes && player.strokeHoles.includes(h.number) ? '*' : ''}
          </td>
        ))}
        <td style={{ ...totalCell, height: '24px', borderTop: topBorder }}></td>
        <td style={{ ...spacer, borderTop: topBorder }}></td>
        {back9.map(h => (
          <td key={h.number} style={{ ...scoreCell, borderTop: topBorder }}>
            {showStrokes && player.strokeHoles.includes(h.number) ? '*' : ''}
          </td>
        ))}
        <td style={{ ...totalCell, height: '24px', borderTop: topBorder }}></td>
        <td style={{ ...totalCell, height: '24px', borderTop: topBorder }}></td>
      </tr>
    )
  }

  function renderLabelRow(label: string, key: string, bold: boolean = true) {
    return (
      <tr key={key}>
        <td colSpan={3} style={{ ...labelCell, fontWeight: bold ? 'bold' : 'normal', fontSize: '10px', textAlign: 'center' }}>
          {label}
        </td>
        {front9.map(h => (
          <td key={h.number} style={{ ...scoreCell }}></td>
        ))}
        <td style={{ ...totalCell, height: '24px' }}></td>
        <td style={spacer}></td>
        {back9.map(h => (
          <td key={h.number} style={{ ...scoreCell }}></td>
        ))}
        <td style={{ ...totalCell, height: '24px' }}></td>
        <td style={{ ...totalCell, height: '24px' }}></td>
      </tr>
    )
  }

  function renderSideRows(sidePlayers: PlayerData[], sideKey: string) {
    const rows: React.ReactNode[] = []

    sidePlayers.forEach((player, idx) => {
      const showStrokes = !isTeamFormat || idx === 0
      rows.push(renderPlayerRow(player, showStrokes, idx === 0))
    })

    if (showBestBall) {
      rows.push(renderLabelRow('BEST BALL (NET)', `${sideKey}-bb`))
    }
    rows.push(renderLabelRow('+/-', `${sideKey}-pm`))

    return rows
  }

  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div className="print-scorecard" style={{ background: 'white', color: 'black', padding: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Scorecard Grid */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '120px' }} />
          <col style={{ width: '28px' }} />
          <col style={{ width: '22px' }} />
          {front9.map(h => <col key={`f${h.number}`} />)}
          <col style={{ width: '34px' }} />
          <col style={{ width: '6px' }} />
          {back9.map(h => <col key={`b${h.number}`} />)}
          <col style={{ width: '34px' }} />
          <col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          {/* Title row — bright green bar */}
          <tr>
            <td colSpan={totalCols} style={{
              background: '#00CC00', color: 'black', fontSize: '13px', fontWeight: 'bold',
              padding: '5px 8px', textAlign: 'center', border: '2px solid #000', ...pca,
            }}>
              {tournamentName.toUpperCase()} - {year} - Round {roundNumber} - {courseName}
            </td>
          </tr>

          {/* FRONT / BACK (or nine names like LINKS / QUARRY) */}
          <tr>
            <td colSpan={3} style={{ border: 'none', background: 'white' }}></td>
            <td colSpan={front9.length + 1} style={{
              textAlign: 'center', fontSize: '11px', fontWeight: 'bold',
              padding: '2px', border: 'none', background: 'white',
            }}>
              FRONT
            </td>
            <td style={{ ...spacer, border: 'none' }}></td>
            <td colSpan={back9.length + 2} style={{
              textAlign: 'center', fontSize: '11px', fontWeight: 'bold',
              padding: '2px', border: 'none', background: 'white',
            }}>
              BACK
            </td>
          </tr>

          {/* HOLE numbers row — white background, black borders */}
          <tr>
            <td style={{ ...labelCell, background: 'white', ...pca }}></td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold', background: 'white', ...pca }}>HOLE</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={{ ...totalCell }}>OUT</td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={{ ...totalCell }}>IN</td>
            <td style={{ ...totalCell }}>TOTAL</td>
          </tr>

          {/* DISTANCE row — tee color background */}
          <tr>
            <td style={{ ...labelCell, fontSize: '10px', fontWeight: 'bold' }}>{formatLabel}</td>
            <td colSpan={2} style={{ ...holeCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{teeName}</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{frontYards}</td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{backYards}</td>
            <td style={{ ...totalCell, fontSize: '9px', background: teeColor, color: 'white', ...pca }}>{totalYards}</td>
          </tr>

          {/* PAR row */}
          <tr>
            <td style={{ ...labelCell, fontSize: '9px' }}>{formatDesc}</td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold' }}>PAR</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.par}</td>
            ))}
            <td style={totalCell}>{frontPar}</td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.par}</td>
            ))}
            <td style={totalCell}>{backPar}</td>
            <td style={totalCell}>{totalPar}</td>
          </tr>

          {/* HDCP row */}
          <tr>
            <td style={labelCell}></td>
            <td colSpan={2} style={{ ...holeCell, fontSize: '9px' }}>HDCP</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontSize: '9px' }}>{h.handicap}</td>
            ))}
            <td style={{ ...totalCell, border: bd }}></td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontSize: '9px' }}>{h.handicap}</td>
            ))}
            <td style={{ ...totalCell, border: bd }}></td>
            <td style={{ ...totalCell, border: bd }}></td>
          </tr>
        </thead>

        <tbody>
          {renderSideRows(side1, 's1')}
          {renderSideRows(side2, 's2')}
        </tbody>
      </table>

      {/* Info Section */}
      <div style={{ marginTop: '14px', fontSize: '10px', lineHeight: '1.6' }}>
        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
          {tournamentName.toUpperCase()} - {year} - Round {roundNumber} - {courseName} - Par {totalPar}
        </div>

        <div style={{ marginBottom: '2px' }}>
          Game {matchNumber}{dateStr ? ` \u2014 ${dateStr}` : ''}
        </div>

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
          <div style={{ marginTop: '6px', fontSize: '9px', color: '#333', whiteSpace: 'pre-line' }}>
            <span style={{ fontWeight: 'bold' }}>Other Rules:</span>
            {'\n'}{localRules}
          </div>
        )}
      </div>
    </div>
  )
}
