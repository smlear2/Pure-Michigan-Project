const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Expected 2025 TILT data from spreadsheet
const EXPECTED = {
  rounds: {
    1: {
      'Stephen Lear': 38, 'Joey Aiello': 46, 'Danny Morales': 36, 'Dave Meyer': 10,
      'Alex Paxton': 24, 'Dylan Plachta': 24, 'Joe Spencer': 20,
      'Tom Bostwick': 22, 'Ben Hammel': 86, 'Zach Lear': 30, 'Joey Ways Jr.': 32,
      'Maxwell Huntley': 26, 'Eric Barkovich': -8, 'Kip Owen': -12,
    },
    2: {
      'Stephen Lear': 20, 'Joey Aiello': 66, 'Danny Morales': 28, 'Dave Meyer': 4,
      'Alex Paxton': 40, 'Dylan Plachta': 16, 'Joe Spencer': 8,
      'Tom Bostwick': 16, 'Ben Hammel': 56, 'Zach Lear': 28, 'Joey Ways Jr.': 34,
      'Maxwell Huntley': 40, 'Eric Barkovich': 26, 'Kip Owen': 24,
    },
    4: {
      'Stephen Lear': 26, 'Joey Aiello': 42, 'Danny Morales': 48, 'Dave Meyer': 32,
      'Alex Paxton': 30, 'Dylan Plachta': 12, 'Joe Spencer': -4,
      'Tom Bostwick': 42, 'Ben Hammel': 42, 'Zach Lear': -10, 'Joey Ways Jr.': 12,
      'Maxwell Huntley': -10, 'Eric Barkovich': 30, 'Kip Owen': 24,
    },
    6: {
      'Stephen Lear': 2, 'Joey Aiello': 32, 'Danny Morales': 34, 'Dave Meyer': 38,
      'Alex Paxton': 46, 'Dylan Plachta': -8, 'Joe Spencer': -8,
      'Tom Bostwick': 30, 'Ben Hammel': 18, 'Zach Lear': 4, 'Joey Ways Jr.': 46,
      'Maxwell Huntley': -6, 'Eric Barkovich': -10, 'Kip Owen': 26,
    },
  },
  totals: {
    'Stephen Lear': 86, 'Joey Aiello': 186, 'Danny Morales': 146, 'Dave Meyer': 84,
    'Alex Paxton': 140, 'Dylan Plachta': 44, 'Joe Spencer': 16,
    'Tom Bostwick': 110, 'Ben Hammel': 202, 'Zach Lear': 52, 'Joey Ways Jr.': 124,
    'Maxwell Huntley': 50, 'Eric Barkovich': 38, 'Kip Owen': 62,
  },
}

const NAME_ALIASES = {
  'Joe Ways': 'Joey Ways Jr.',
  'Zach Stitt': 'Zack Stitt',
}

function dbNameToSheetName(dbName) {
  if (NAME_ALIASES[dbName] !== undefined) return NAME_ALIASES[dbName]
  return dbName
}

function skinsHandicap(index, slope, rating, coursePar, maxHdcp) {
  const raw = (index * slope / 113 + (rating - coursePar)) * 0.8
  return Math.min(Math.ceil(raw), maxHdcp || 24)
}

function receivesStroke(courseHdcp, holeHdcp) {
  return courseHdcp >= holeHdcp
}

function receivesDoubleStroke(courseHdcp, holeHdcp) {
  return courseHdcp >= holeHdcp + 18
}

function calculateTiltPoints(netScore, par) {
  const diff = netScore - par
  if (diff <= -3) return 16
  if (diff === -2) return 8
  if (diff === -1) return 4
  if (diff === 0) return 2
  if (diff === 1) return 0
  return -4
}

function computeTiltForPlayer(holeResults, startMult, startStreak) {
  let multiplier = startMult || 1
  let streak = startStreak || 0
  let totalPoints = 0
  const holeDetail = []

  for (const hole of holeResults) {
    const basePoints = calculateTiltPoints(hole.netScore, hole.par)
    const diff = hole.netScore - hole.par

    const pts = basePoints * multiplier
    totalPoints += pts
    holeDetail.push({ ...hole, basePoints, multiplier, pts, diff })

    if (diff <= -1) {
      const birdieCount = diff === -2 ? 2 : (diff <= -3 ? 3 : 1)
      streak += birdieCount
      multiplier = streak + 1
    } else {
      streak = 0
      multiplier = 1
    }
  }

  return { totalPoints, finalMultiplier: multiplier, finalStreak: streak, holeDetail }
}

async function main() {
  const trip = await p.trip.findFirst({ where: { year: 2025 } })
  if (!trip) { console.log('No 2025 trip found'); return }

  const hdcpConfig = trip.handicapConfig
  const maxHdcp = hdcpConfig?.maxHandicap || 24

  const tripPlayers = await p.tripPlayer.findMany({
    where: { tripId: trip.id, isActive: true },
    include: { user: { select: { name: true } } },
  })

  const optedOutNames = new Set(['Ryan Hubona', 'Zack Stitt'])

  // Try both with and without carryover
  for (const useCarryover of [false, true]) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`=== 2025 TILT Verification (carryover=${useCarryover}) ===`)
    console.log(`${'='.repeat(60)}\n`)

    const tiltRoundNumbers = [1, 2, 4, 6]
    const rounds = await p.round.findMany({
      where: { tripId: trip.id, roundNumber: { in: tiltRoundNumbers } },
      include: { tee: { include: { holes: { orderBy: { number: 'asc' } } } } },
      orderBy: { roundNumber: 'asc' },
    })

    let totalMatch = 0, totalDiff = 0
    const grandTotals = new Map()
    const carryoverState = {} // playerId -> { mult, streak }

    for (const round of rounds) {
      const rn = round.roundNumber
      const expected = EXPECTED.rounds[rn]
      if (!expected) continue

      const coursePar = round.tee.holes.reduce((s, h) => s + h.par, 0)

      const scores = await p.score.findMany({
        where: { matchPlayer: { match: { roundId: round.id } } },
        include: {
          hole: true,
          matchPlayer: {
            select: {
              tripPlayerId: true,
              tripPlayer: { select: { handicapAtTime: true, user: { select: { name: true } } } },
            },
          },
        },
      })

      const playerScores = new Map()
      for (const s of scores) {
        const tpId = s.matchPlayer.tripPlayerId
        const name = s.matchPlayer.tripPlayer.user.name
        const sheetName = dbNameToSheetName(name)
        if (!sheetName || optedOutNames.has(sheetName)) continue

        if (!playerScores.has(tpId)) {
          playerScores.set(tpId, {
            name, sheetName,
            handicapIndex: s.matchPlayer.tripPlayer.handicapAtTime || 0,
            holes: [],
          })
        }
        const hole = round.tee.holes.find(h => h.id === s.holeId)
        if (!hole) continue
        const existing = playerScores.get(tpId).holes.find(h => h.number === hole.number)
        if (!existing) {
          playerScores.get(tpId).holes.push({
            number: hole.number, grossScore: s.grossScore,
            par: hole.par, hdcpIndex: hole.handicap,
          })
        }
      }

      console.log(`--- R${rn} ${round.name} (par ${coursePar}, slope ${round.tee.slope}, rating ${round.tee.rating}) ---`)
      let roundMatch = 0, roundDiff = 0

      for (const [tpId, pd] of playerScores) {
        const sHdcp = skinsHandicap(pd.handicapIndex, round.tee.slope, round.tee.rating, coursePar, maxHdcp)
        pd.holes.sort((a, b) => a.number - b.number)

        const holeResults = pd.holes.map(h => {
          const hasStroke = receivesStroke(sHdcp, h.hdcpIndex)
          const hasDouble = receivesDoubleStroke(sHdcp, h.hdcpIndex)
          const strokesRcvd = hasDouble ? 2 : hasStroke ? 1 : 0
          return { number: h.number, netScore: h.grossScore - strokesRcvd, par: h.par, grossScore: h.grossScore, strokesRcvd }
        })

        const startMult = useCarryover ? (carryoverState[tpId]?.mult || 1) : 1
        const startStreak = useCarryover ? (carryoverState[tpId]?.streak || 0) : 0
        const { totalPoints, finalMultiplier, finalStreak, holeDetail } = computeTiltForPlayer(holeResults, startMult, startStreak)

        // Save carryover
        carryoverState[tpId] = { mult: finalMultiplier, streak: finalStreak }

        const exp = expected[pd.sheetName]
        if (exp === undefined) continue

        const ok = totalPoints === exp
        if (ok) roundMatch++
        else {
          roundDiff++
          console.log(`  ${pd.sheetName}: computed=${totalPoints} expected=${exp} DIFF (hdcp=${sHdcp}, index=${pd.handicapIndex})`)
          // Show hole detail for mismatches
          for (const h of holeDetail) {
            const label = h.diff < 0 ? (h.diff === -1 ? 'birdie' : h.diff === -2 ? 'eagle' : 'alb') :
                          h.diff === 0 ? 'par' : h.diff === 1 ? 'bogey' : 'dbl+'
            if (h.pts !== h.basePoints || h.multiplier > 1 || h.diff !== 0) {
              console.log(`    H${h.number}: gross=${h.grossScore} strk=${h.strokesRcvd} net=${h.netScore} par=${h.par} ${label} base=${h.basePoints} mult=${h.multiplier} pts=${h.pts}`)
            }
          }
        }

        grandTotals.set(pd.sheetName, (grandTotals.get(pd.sheetName) || 0) + totalPoints)
      }

      const total = roundMatch + roundDiff
      console.log(`  Result: ${roundMatch}/${total} ${roundDiff === 0 ? 'OK' : roundDiff + ' DIFF'}`)
      totalMatch += roundMatch
      totalDiff += roundDiff
    }

    console.log('\n--- Tournament Totals ---')
    let totMatch = 0, totDiff = 0
    const sortedEntries = Array.from(grandTotals.entries()).sort((a, b) => b[1] - a[1])
    for (const [name, computed] of sortedEntries) {
      const exp = EXPECTED.totals[name]
      if (exp === undefined) continue
      const ok = computed === exp
      if (ok) totMatch++
      else {
        totDiff++
        console.log(`  ${name}: computed=${computed} expected=${exp} DIFF (${computed - exp > 0 ? '+' : ''}${computed - exp})`)
      }
    }
    console.log(`  Result: ${totMatch}/${totMatch + totDiff} ${totDiff === 0 ? 'OK' : totDiff + ' DIFF'}`)
    console.log(`\n=== TOTAL: per-round ${totalMatch}/${totalMatch + totalDiff}, totals ${totMatch}/${totMatch + totDiff} ===`)
  }

  await p.$disconnect()
}
main()
