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
  const holeCell: React.CSSProperties = { border: bd, textAlign: 'center', verticalAlign: 'middle', fontSize: '10px', padding: '0 1px', minWidth: '34px' }
  const totalCell: React.CSSProperties = { ...holeCell, fontWeight: 'bold' }
  const scoreCell: React.CSSProperties = { ...holeCell, height: '34px', position: 'relative' as const }
  const labelCell: React.CSSProperties = { border: bd, textAlign: 'left', verticalAlign: 'middle', fontSize: '10px', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden' }

  // Tee-colored cell for TEES row
  const teeCell: React.CSSProperties = { ...holeCell, background: teeColor, color: 'white', fontSize: '8px', ...pca }

  function getDisplayStrokes(player: PlayerData): number {
    if (isTeamFormat) return player.playingHandicap
    const minCourseHcp = Math.min(...players.map(p => p.courseHandicap))
    return Math.max(0, player.courseHandicap - minCourseHcp)
  }

  function renderPlayerRow(player: PlayerData, showStrokes: boolean, isFirst: boolean) {
    const strokes = getDisplayStrokes(player)

    return (
      <tr key={`player-${player.name}`}>
        <td colSpan={2} style={{ ...labelCell, fontSize: '12px', fontWeight: 'bold', borderRight: 'none' }}>
          {player.name} ({player.courseHandicap})
        </td>
        <td style={{ ...holeCell, fontSize: '11px', fontWeight: 'bold', borderLeft: 'none', textAlign: 'left' }}>
          {showStrokes ? strokes : ''}
        </td>
        {front9.map(h => (
          <td key={h.number} style={scoreCell}>
            {showStrokes && player.strokeHoles.includes(h.number) && (
              <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '10px', lineHeight: '1' }}>{'\u25CF'}</span>
            )}
          </td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={spacer}></td>
        {back9.map(h => (
          <td key={h.number} style={scoreCell}>
            {showStrokes && player.strokeHoles.includes(h.number) && (
              <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '10px', lineHeight: '1' }}>{'\u25CF'}</span>
            )}
          </td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={{ ...totalCell, height: '34px' }}></td>
      </tr>
    )
  }

  function renderLabelRow(label: string, key: string, bold: boolean = true) {
    return (
      <tr key={key}>
        <td colSpan={2} style={{ ...labelCell, fontWeight: bold ? 'bold' : 'normal', fontSize: '10px', textAlign: 'center', borderRight: 'none' }}>
          {label}
        </td>
        <td style={{ ...holeCell, borderLeft: 'none' }}></td>
        {front9.map(h => (
          <td key={h.number} style={scoreCell}></td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={spacer}></td>
        {back9.map(h => (
          <td key={h.number} style={scoreCell}></td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={{ ...totalCell, height: '34px' }}></td>
      </tr>
    )
  }

  function renderTeamRow(sidePlayers: PlayerData[], sideKey: string) {
    // Team formats: one combined row with both names, one set of score boxes
    const first = sidePlayers[0]
    const strokes = getDisplayStrokes(first)
    const names = sidePlayers.map(p => p.name).join(' / ')
    const hdcps = sidePlayers.map(p => `${p.courseHandicap}`).join('/')

    return (
      <tr key={`team-${sideKey}`}>
        <td colSpan={2} style={{ ...labelCell, fontSize: '12px', fontWeight: 'bold', borderRight: 'none' }}>
          {names} ({hdcps})
        </td>
        <td style={{ ...holeCell, fontSize: '11px', fontWeight: 'bold', borderLeft: 'none', textAlign: 'left' }}>
          {strokes}
        </td>
        {front9.map(h => (
          <td key={h.number} style={scoreCell}>
            {first.strokeHoles.includes(h.number) && (
              <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '10px', lineHeight: '1' }}>{'\u25CF'}</span>
            )}
          </td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={spacer}></td>
        {back9.map(h => (
          <td key={h.number} style={scoreCell}>
            {first.strokeHoles.includes(h.number) && (
              <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '10px', lineHeight: '1' }}>{'\u25CF'}</span>
            )}
          </td>
        ))}
        <td style={{ ...totalCell, height: '34px' }}></td>
        <td style={{ ...totalCell, height: '34px' }}></td>
      </tr>
    )
  }

  function renderSideRows(sidePlayers: PlayerData[], sideKey: string) {
    const rows: React.ReactNode[] = []

    if (isTeamFormat) {
      // One score row for the team
      rows.push(renderTeamRow(sidePlayers, sideKey))
    } else {
      // Individual score row per player
      sidePlayers.forEach((player, idx) => {
        rows.push(renderPlayerRow(player, true, idx === 0))
      })
    }

    if (showBestBall) {
      rows.push(renderLabelRow('BEST BALL (NET)', `${sideKey}-bb`))
    }
    rows.push(renderLabelRow('Match +/-', `${sideKey}-pm`))

    return rows
  }

  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div className="print-scorecard" style={{ background: 'white', color: 'black', padding: '10px', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase' }}>
      {/* Scorecard Grid */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '120px' }} />
          <col style={{ width: '24px' }} />
          <col style={{ width: '18px' }} />
          {front9.map(h => <col key={`f${h.number}`} style={{ width: '34px' }} />)}
          <col style={{ width: '34px' }} />
          <col style={{ width: '6px' }} />
          {back9.map(h => <col key={`b${h.number}`} style={{ width: '34px' }} />)}
          <col style={{ width: '34px' }} />
          <col style={{ width: '34px' }} />
        </colgroup>
        <thead>
          {/* Title row — bright green bar */}
          <tr>
            <td colSpan={totalCols} style={{
              background: '#4CAF50', color: 'white', fontSize: '13px', fontWeight: 'bold',
              padding: '5px 8px', textAlign: 'center', border: '2px solid #000', ...pca,
            }}>
              {tournamentName.toUpperCase()} - {year} - Round {roundNumber} - {courseName}
            </td>
          </tr>

          {/* FRONT / BACK */}
          <tr>
            <td colSpan={3} style={{ border: 'none', background: 'white' }}></td>
            <td colSpan={front9.length + 1} style={{
              textAlign: 'center', fontSize: '10px', fontWeight: 'bold',
              padding: '2px', border: 'none', background: 'white',
            }}>
              FRONT
            </td>
            <td style={{ ...spacer, border: 'none' }}></td>
            <td colSpan={back9.length + 2} style={{
              textAlign: 'center', fontSize: '10px', fontWeight: 'bold',
              padding: '2px', border: 'none', background: 'white',
            }}>
              BACK
            </td>
          </tr>

          {/* HOLE numbers row */}
          <tr>
            <td style={{ ...labelCell, background: 'white', fontWeight: 'bold', borderRight: 'none', borderBottom: 'none', ...pca }}>{'Format: '}{formatLabel}</td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold', borderLeft: 'none', borderBottom: 'none' }}>HOLE</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={totalCell}>OUT</td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.number}</td>
            ))}
            <td style={totalCell}>IN</td>
            <td style={totalCell}>TOTAL</td>
          </tr>

          {/* DISTANCE row — tee color on yardage cells */}
          <tr>
            <td style={{ ...labelCell, fontWeight: 'bold', borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}>{formatDesc}</td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>{teeName}</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold', background: teeColor, color: 'white', ...pca }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCell, background: teeColor, color: 'white', ...pca }}>{frontYards}</td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold', background: teeColor, color: 'white', ...pca }}>{h.yardage}</td>
            ))}
            <td style={{ ...totalCell, background: teeColor, color: 'white', ...pca }}>{backYards}</td>
            <td style={{ ...totalCell, background: teeColor, color: 'white', ...pca }}>{totalYards}</td>
          </tr>

          {/* PAR row */}
          <tr>
            <td style={{ ...labelCell, fontWeight: 'bold', borderRight: 'none', borderTop: 'none', borderBottom: 'none' }}></td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold', borderLeft: 'none', borderTop: 'none', borderBottom: 'none' }}>PAR</td>
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
            <td style={{ ...labelCell, fontWeight: 'bold', borderRight: 'none', borderTop: 'none' }}>Player (HDCP)</td>
            <td colSpan={2} style={{ ...holeCell, fontWeight: 'bold', borderLeft: 'none', borderTop: 'none' }}>HDCP</td>
            {front9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.handicap}</td>
            ))}
            <td style={totalCell}></td>
            <td style={spacer}></td>
            {back9.map(h => (
              <td key={h.number} style={{ ...holeCell, fontWeight: 'bold' }}>{h.handicap}</td>
            ))}
            <td style={totalCell}></td>
            <td style={totalCell}></td>
          </tr>
        </thead>

        <tbody>
          {renderSideRows(side1, 's1')}
          {renderSideRows(side2, 's2')}
        </tbody>
      </table>

    </div>
  )
}

export function PrintableScorecardBack({
  tournamentName,
  year,
  courseName,
  roundNumber,
  format,
  matchNumber,
  date,
  totalPar,
  totalYards,
  teeName,
  teeRating,
  teeSlope,
  side1,
  side2,
  localRules,
}: {
  tournamentName: string
  year: number
  courseName: string
  roundNumber: number
  format: string
  matchNumber: number
  date: string | null
  totalPar: number
  totalYards: number
  teeName: string
  teeRating: number
  teeSlope: number
  side1: { name: string; teamName: string; handicapIndex: number }[]
  side2: { name: string; teamName: string; handicapIndex: number }[]
  localRules?: string
}) {
  const formatLabel = FORMAT_LABELS[format] || format
  const formatDesc = FORMAT_DESCRIPTIONS[format] || ''
  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const lbl: React.CSSProperties = { fontSize: '11px', color: '#555', fontWeight: 'bold', paddingRight: '12px', verticalAlign: 'top', paddingBottom: '4px' }
  const val: React.CSSProperties = { fontSize: '12px', paddingBottom: '4px' }

  return (
    <div className="print-scorecard" style={{ background: 'white', color: 'black', padding: '20px 30px', fontFamily: 'Arial, Helvetica, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>
          {tournamentName.toUpperCase()}
        </div>
        <div style={{ fontSize: '13px', color: '#333' }}>
          {year} &mdash; Round {roundNumber} &mdash; {courseName} &mdash; Par {totalPar}
        </div>
      </div>

      {/* Match Info */}
      <table style={{ borderCollapse: 'collapse', margin: '0 auto', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={lbl}>Game</td>
            <td style={val}>{matchNumber}{dateStr ? ` \u2014 ${dateStr}` : ''}</td>
          </tr>
          <tr>
            <td style={lbl}>{side1[0]?.teamName || 'Side 1'}</td>
            <td style={val}>{side1.map(p => `${p.name} (${p.handicapIndex})`).join(' & ')}</td>
          </tr>
          <tr>
            <td style={lbl}>{side2[0]?.teamName || 'Side 2'}</td>
            <td style={val}>{side2.map(p => `${p.name} (${p.handicapIndex})`).join(' & ')}</td>
          </tr>
          <tr><td style={{ paddingBottom: '8px' }} colSpan={2}></td></tr>
          <tr>
            <td style={lbl}>Format</td>
            <td style={val}>{formatLabel} {formatDesc}</td>
          </tr>
          <tr>
            <td style={lbl}>Tees</td>
            <td style={val}>{teeName} ({teeRating}/{teeSlope}) &mdash; {totalYards} Yards</td>
          </tr>
        </tbody>
      </table>

      {/* Local Rules */}
      {localRules && (
        <div style={{ marginTop: '20px', padding: '12px 16px', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '600px', margin: '20px auto 0' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Other Rules</div>
          <div style={{ fontSize: '11px', color: '#333', whiteSpace: 'pre-line', lineHeight: '1.6' }}>
            {localRules}
          </div>
        </div>
      )}
    </div>
  )
}
