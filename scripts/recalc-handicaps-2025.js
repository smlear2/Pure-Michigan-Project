/**
 * Recalculate all 2025 handicaps, net scores, and match results
 * using the correct handicap config (80%, off the low, 60/40 foursomes, 35/15 scramble).
 *
 * Steps:
 * 1. Set handicapConfig on the 2025 trip
 * 2. For each match: recompute courseHandicap, apply config, update playingHandicap
 * 3. Recalculate all Score.netScore and Score.strokeReceived
 * 4. Recalculate all match results
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// --- Mirror the library functions (pure JS versions) ---

function calcCourseHandicap(index, slope) {
  return Math.round(index * slope / 113)
}

function calcAdjustedHandicap(courseHdcp, percentage) {
  return Math.ceil(courseHdcp * percentage / 100)
}

function applyCap(value, max) {
  if (max != null && value > max) return max
  return value
}

function calcTeamHandicap(adjustedHdcps, lowPct, highPct) {
  const sorted = [...adjustedHdcps].sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return Math.round(sorted[0] * lowPct / 100)
  return Math.round(sorted[0] * lowPct / 100 + sorted[1] * highPct / 100)
}

const TEAM_FORMATS = new Set(['FOURSOMES', 'SCRAMBLE', 'MODIFIED_ALT_SHOT'])

function computeMatchHandicaps(players, format, config) {
  const pct = config.percentage
  const isTeam = TEAM_FORMATS.has(format) && config.teamCombos?.[format]

  if (isTeam) {
    const combo = config.teamCombos[format]
    // Step 1: Adjust each player (ceil + cap)
    const adjusted = players.map(p => ({
      ...p,
      adjusted: applyCap(calcAdjustedHandicap(p.courseHdcp, pct), config.maxHandicap),
    }))

    // Step 2: Group by side, compute team handicaps
    const sides = new Map()
    for (const p of adjusted) {
      if (!sides.has(p.side)) sides.set(p.side, [])
      sides.get(p.side).push(p)
    }

    const sideTeamHdcps = new Map()
    for (const [side, sidePlayers] of sides) {
      const hdcps = sidePlayers.map(p => p.adjusted)
      sideTeamHdcps.set(side, calcTeamHandicap(hdcps, combo.lowPct, combo.highPct))
    }

    // Step 3: Off the low
    const lowest = Math.min(...sideTeamHdcps.values())

    return adjusted.map(p => ({
      tripPlayerId: p.tripPlayerId,
      matchPlayerId: p.matchPlayerId,
      courseHandicap: p.courseHdcp,
      playingHandicap: Math.max(0, sideTeamHdcps.get(p.side) - lowest),
    }))
  } else {
    // Individual format (ceil + cap)
    const adjusted = players.map(p => ({
      ...p,
      adjusted: applyCap(calcAdjustedHandicap(p.courseHdcp, pct), config.maxHandicap),
    }))
    const lowest = Math.min(...adjusted.map(a => a.adjusted))
    return adjusted.map(p => ({
      tripPlayerId: p.tripPlayerId,
      matchPlayerId: p.matchPlayerId,
      courseHandicap: p.courseHdcp,
      playingHandicap: Math.max(0, p.adjusted - lowest),
    }))
  }
}

function receivesStroke(playingHdcp, holeStrokeIndex) {
  if (playingHdcp <= 0) return false
  return playingHdcp >= holeStrokeIndex
}

function receivesDoubleStroke(playingHdcp, holeStrokeIndex) {
  if (playingHdcp <= 18) return false
  return (playingHdcp - 18) >= holeStrokeIndex
}

// Match play functions
function bestBall(netScores) {
  const valid = netScores.filter(s => s !== null)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

function holeWinner(side1Net, side2Net) {
  if (side1Net === null || side2Net === null) return null
  if (side1Net < side2Net) return 'SIDE1'
  if (side2Net < side1Net) return 'SIDE2'
  return 'HALVED'
}

function computeMatchState(holeResults, totalHoles, pointsForWin, pointsForHalf) {
  let side1Lead = 0, holesPlayed = 0, matchClosedAt = null

  for (let i = 0; i < holeResults.length; i++) {
    const result = holeResults[i]
    if (result === null) continue
    holesPlayed++
    if (result === 'SIDE1') side1Lead++
    else if (result === 'SIDE2') side1Lead--
    const holesRemaining = totalHoles - holesPlayed
    if (Math.abs(side1Lead) > holesRemaining && holesRemaining > 0) {
      matchClosedAt = holesPlayed
      break
    }
  }

  const isComplete = matchClosedAt !== null || (holesPlayed === totalHoles)
  let resultText = null, side1Points = 0, side2Points = 0

  if (isComplete) {
    if (side1Lead === 0) {
      resultText = 'Halved'
      side1Points = pointsForHalf
      side2Points = pointsForHalf
    } else if (matchClosedAt !== null) {
      const remaining = totalHoles - matchClosedAt
      resultText = `${Math.abs(side1Lead)}&${remaining}`
      if (side1Lead > 0) side1Points = pointsForWin
      else side2Points = pointsForWin
    } else {
      resultText = `${Math.abs(side1Lead)}UP`
      if (side1Lead > 0) side1Points = pointsForWin
      else side2Points = pointsForWin
    }
  }

  return { resultText, side1Points, side2Points }
}

// ============================================================
// MAIN
// ============================================================

const HANDICAP_CONFIG = {
  percentage: 80,
  offTheLow: true,
  maxHandicap: 20,
  teamCombos: {
    FOURSOMES: { lowPct: 60, highPct: 40 },
    SCRAMBLE: { lowPct: 35, highPct: 15 },
  },
}

async function main() {
  console.log('=== Recalculate 2025 Handicaps + Scores + Match Results ===\n')

  // 1. Set handicap config on the 2025 trip
  const trip = await prisma.trip.findFirst({ where: { year: 2025 } })
  if (!trip) throw new Error('2025 trip not found')

  await prisma.trip.update({
    where: { id: trip.id },
    data: { handicapConfig: HANDICAP_CONFIG },
  })
  console.log('Set handicapConfig on 2025 trip:', JSON.stringify(HANDICAP_CONFIG))

  // 2. Load full trip data
  const fullTrip = await prisma.trip.findFirst({
    where: { year: 2025 },
    include: {
      teams: true,
      rounds: {
        include: {
          tee: { include: { holes: { orderBy: { number: 'asc' } } } },
          matches: {
            include: {
              players: {
                include: {
                  tripPlayer: {
                    include: { user: { select: { name: true } }, team: { select: { name: true } } }
                  },
                  scores: { include: { hole: true }, orderBy: { hole: { number: 'asc' } } }
                }
              }
            },
            orderBy: { matchNumber: 'asc' }
          }
        },
        orderBy: { roundNumber: 'asc' }
      },
      tripPlayers: true,
    }
  })

  const teamPoints = {}
  fullTrip.teams.forEach(t => { teamPoints[t.name] = 0 })

  let totalScoresUpdated = 0
  let totalMatchesUpdated = 0

  for (const round of fullTrip.rounds) {
    const format = round.format
    const holes = round.tee.holes
    const slope = round.tee.slope

    console.log(`\nROUND ${round.roundNumber}: ${round.name} (${format}) - slope=${slope}`)

    for (const match of round.matches) {
      const s1Team = match.players.find(p => p.side === 1)?.tripPlayer.team?.name || '?'
      const s2Team = match.players.find(p => p.side === 2)?.tripPlayer.team?.name || '?'

      // Build handicap inputs
      const inputs = match.players.map(mp => ({
        tripPlayerId: mp.tripPlayerId,
        matchPlayerId: mp.id,
        courseHdcp: calcCourseHandicap(mp.tripPlayer.handicapAtTime ?? 0, slope),
        side: mp.side,
      }))

      // Compute new handicaps
      const results = computeMatchHandicaps(inputs, format, HANDICAP_CONFIG)

      // Update each MatchPlayer and recalculate scores
      for (const mp of match.players) {
        const result = results.find(r => r.matchPlayerId === mp.id)
        const oldPH = mp.playingHandicap
        const newPH = result.playingHandicap
        const newCH = result.courseHandicap

        // Update MatchPlayer
        await prisma.matchPlayer.update({
          where: { id: mp.id },
          data: { courseHandicap: newCH, playingHandicap: newPH },
        })

        // Recalculate each score's netScore
        for (const score of mp.scores) {
          const hasStroke = receivesStroke(newPH, score.hole.handicap)
          const hasDouble = receivesDoubleStroke(newPH, score.hole.handicap)
          const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
          const netScore = score.grossScore - strokesReceived

          if (netScore !== score.netScore || (hasStroke || hasDouble) !== score.strokeReceived) {
            await prisma.score.update({
              where: { id: score.id },
              data: { netScore, strokeReceived: hasStroke || hasDouble },
            })
            totalScoresUpdated++
          }
        }

        const name = mp.tripPlayer.user.name
        if (oldPH !== newPH) {
          console.log(`  ${name}: CH ${mp.courseHandicap}→${newCH}, PH ${oldPH}→${newPH}`)
        }
      }

      // Recalculate match result
      const holeResults = holes.map(hole => {
        const side1Scores = match.players.filter(p => p.side === 1).map(p => {
          const score = p.scores.find(s => s.holeId === hole.id)
          if (!score) return null
          // Recalculate net using the NEW playing handicap
          const result = results.find(r => r.matchPlayerId === p.id)
          const hasStroke = receivesStroke(result.playingHandicap, hole.handicap)
          const hasDouble = receivesDoubleStroke(result.playingHandicap, hole.handicap)
          const strokes = hasDouble ? 2 : hasStroke ? 1 : 0
          return score.grossScore - strokes
        })
        const side2Scores = match.players.filter(p => p.side === 2).map(p => {
          const score = p.scores.find(s => s.holeId === hole.id)
          if (!score) return null
          const result = results.find(r => r.matchPlayerId === p.id)
          const hasStroke = receivesStroke(result.playingHandicap, hole.handicap)
          const hasDouble = receivesDoubleStroke(result.playingHandicap, hole.handicap)
          const strokes = hasDouble ? 2 : hasStroke ? 1 : 0
          return score.grossScore - strokes
        })

        let side1Net = null, side2Net = null
        if (format === 'FOURBALL' || format === 'SHAMBLE') {
          side1Net = bestBall(side1Scores)
          side2Net = bestBall(side2Scores)
        } else if (format === 'SINGLES') {
          side1Net = side1Scores[0] ?? null
          side2Net = side2Scores[0] ?? null
        } else if (format === 'FOURSOMES' || format === 'MODIFIED_ALT_SHOT' || format === 'SCRAMBLE') {
          side1Net = side1Scores.find(s => s !== null) ?? null
          side2Net = side2Scores.find(s => s !== null) ?? null
        }

        return holeWinner(side1Net, side2Net)
      })

      const state = computeMatchState(holeResults, holes.length, fullTrip.pointsForWin, fullTrip.pointsForHalf)

      const changed = (state.resultText !== match.resultText ||
                       state.side1Points !== match.side1Points ||
                       state.side2Points !== match.side2Points)

      if (changed) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            resultText: state.resultText,
            side1Points: state.side1Points,
            side2Points: state.side2Points,
          },
        })
        totalMatchesUpdated++
      }

      const s1Names = match.players.filter(p => p.side === 1).map(p => p.tripPlayer.user.name).join(' & ')
      const s2Names = match.players.filter(p => p.side === 2).map(p => p.tripPlayer.user.name).join(' & ')
      const mark = changed ? ' *** UPDATED ***' : ''
      console.log(`  M${match.matchNumber}: [${s1Team}] ${s1Names} vs [${s2Team}] ${s2Names} → ${state.resultText} (${state.side1Points}/${state.side2Points})${mark}`)

      teamPoints[s1Team] = (teamPoints[s1Team] || 0) + state.side1Points
      teamPoints[s2Team] = (teamPoints[s2Team] || 0) + state.side2Points
    }
  }

  console.log(`\n=== RESULTS ===`)
  console.log(`Scores updated: ${totalScoresUpdated}`)
  console.log(`Matches updated: ${totalMatchesUpdated}`)
  console.log()
  for (const [team, pts] of Object.entries(teamPoints)) {
    console.log(`  ${team}: ${pts}`)
  }

  // Verify
  const usTotal = teamPoints['US'] || 0
  const euTotal = teamPoints['Europe'] || 0
  if (usTotal === 16 && euTotal === 12) {
    console.log('\n✓ VERIFIED: US 16 - EU 12')
  } else {
    console.log(`\n✗ MISMATCH: Expected US 16 - EU 12, got US ${usTotal} - EU ${euTotal}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
