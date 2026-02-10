import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Realistic score generation based on course handicap
function generateGrossScore(par: number, courseHandicap: number): number {
  const roll = Math.random()

  if (courseHandicap <= 5) {
    // Low handicap: mostly pars and bogeys, occasional birdies
    if (roll < 0.01) return par - 2
    if (roll < 0.14) return par - 1
    if (roll < 0.54) return par
    if (roll < 0.82) return par + 1
    if (roll < 0.95) return par + 2
    return par + 3
  } else if (courseHandicap <= 12) {
    // Mid handicap: mix of pars, bogeys, doubles
    if (roll < 0.005) return par - 2
    if (roll < 0.06) return par - 1
    if (roll < 0.30) return par
    if (roll < 0.65) return par + 1
    if (roll < 0.87) return par + 2
    if (roll < 0.96) return par + 3
    return par + 4
  } else if (courseHandicap <= 20) {
    // Higher handicap: bogeys and doubles common
    if (roll < 0.002) return par - 2
    if (roll < 0.03) return par - 1
    if (roll < 0.18) return par
    if (roll < 0.50) return par + 1
    if (roll < 0.77) return par + 2
    if (roll < 0.92) return par + 3
    return par + 4
  } else {
    // 20+: doubles and triples common
    if (roll < 0.01) return par - 1
    if (roll < 0.10) return par
    if (roll < 0.35) return par + 1
    if (roll < 0.62) return par + 2
    if (roll < 0.82) return par + 3
    if (roll < 0.94) return par + 4
    return par + 5
  }
}

// Scramble scores: team picks best shot each time, very competitive
function generateScrambleScore(par: number, bestHandicap: number): number {
  const roll = Math.random()
  // Scrambles typically shoot well under par as a team
  if (roll < 0.03) return par - 2
  if (roll < 0.25) return par - 1
  if (roll < 0.65) return par
  if (roll < 0.88) return par + 1
  if (roll < 0.97) return par + 2
  return par + 3
}

async function main() {
  // 1. Delete ALL existing scores
  const deleted = await prisma.score.deleteMany({})
  console.log(`Deleted ${deleted.count} existing scores`)

  // 2. Load all rounds with full context
  const rounds = await prisma.round.findMany({
    include: {
      tee: {
        include: { holes: { orderBy: { number: 'asc' } } },
      },
      matches: {
        include: {
          players: {
            include: { tripPlayer: true },
            orderBy: [{ side: 'asc' }],
          },
        },
        orderBy: { matchNumber: 'asc' },
      },
      trip: true,
    },
    orderBy: { roundNumber: 'asc' },
  })

  let totalScores = 0

  for (const round of rounds) {
    const holes = round.tee.holes
    const format = round.format
    console.log(`\nRound ${round.roundNumber}: ${round.name || format} (${format}) — ${round.matches.length} matches`)

    for (const match of round.matches) {
      const side1Players = match.players.filter(p => p.side === 1)
      const side2Players = match.players.filter(p => p.side === 2)
      const scoreBatch: Array<{
        matchPlayerId: string
        tripPlayerId: string
        holeId: string
        grossScore: number
        netScore: number
        strokeReceived: boolean
      }> = []

      const isTeamSingleScore = format === 'FOURSOMES' || format === 'SCRAMBLE' || format === 'MODIFIED_ALT_SHOT'

      for (const hole of holes) {
        if (isTeamSingleScore) {
          // One score per side, attributed to first player
          for (const sidePlayers of [side1Players, side2Players]) {
            const primary = sidePlayers[0]
            if (!primary) continue

            let gross: number
            if (format === 'SCRAMBLE') {
              const bestHdcp = Math.min(...sidePlayers.map(p => p.courseHandicap))
              gross = generateScrambleScore(hole.par, bestHdcp)
            } else {
              // FOURSOMES / MODIFIED_ALT_SHOT: average of pair
              const avgHdcp = sidePlayers.reduce((s, p) => s + p.courseHandicap, 0) / sidePlayers.length
              gross = generateGrossScore(hole.par, avgHdcp)
            }

            const strokeReceived = hole.handicap <= primary.playingHandicap
            const net = gross - (strokeReceived ? 1 : 0)

            scoreBatch.push({
              matchPlayerId: primary.id,
              tripPlayerId: primary.tripPlayerId,
              holeId: hole.id,
              grossScore: gross,
              netScore: net,
              strokeReceived,
            })
          }
        } else {
          // FOURBALL, SHAMBLE, SINGLES: individual scores for every player
          for (const mp of match.players) {
            const gross = generateGrossScore(hole.par, mp.courseHandicap)
            const strokeReceived = hole.handicap <= mp.playingHandicap
            const net = gross - (strokeReceived ? 1 : 0)

            scoreBatch.push({
              matchPlayerId: mp.id,
              tripPlayerId: mp.tripPlayerId,
              holeId: hole.id,
              grossScore: gross,
              netScore: net,
              strokeReceived,
            })
          }
        }
      }

      // Batch insert all scores for this match
      await prisma.score.createMany({ data: scoreBatch })
      totalScores += scoreBatch.length
      console.log(`  Match ${match.matchNumber}: ${scoreBatch.length} scores`)
    }
  }

  console.log(`\nTotal scores inserted: ${totalScores}`)

  // 3. Recompute match results
  console.log('\n--- Recomputing match results ---')

  for (const round of rounds) {
    const holes = round.tee.holes
    const format = round.format
    const trip = round.trip

    for (const match of round.matches) {
      // Reload scores
      const fullMatch = await prisma.match.findUnique({
        where: { id: match.id },
        include: {
          players: {
            include: {
              scores: { include: { hole: true }, orderBy: { hole: { number: 'asc' } } },
            },
            orderBy: [{ side: 'asc' }],
          },
        },
      })
      if (!fullMatch) continue

      const side1 = fullMatch.players.filter(p => p.side === 1)
      const side2 = fullMatch.players.filter(p => p.side === 2)

      if (format === 'STROKEPLAY') {
        const s1Total = side1.reduce((s, p) => s + p.scores.reduce((ss, sc) => ss + sc.netScore, 0), 0)
        const s2Total = side2.reduce((s, p) => s + p.scores.reduce((ss, sc) => ss + sc.netScore, 0), 0)

        let resultText: string, side1Points: number, side2Points: number
        if (s1Total < s2Total) {
          resultText = `${s2Total - s1Total}UP`
          side1Points = trip.pointsForWin
          side2Points = 0
        } else if (s2Total < s1Total) {
          resultText = `${s1Total - s2Total}UP`
          side1Points = 0
          side2Points = trip.pointsForWin
        } else {
          resultText = 'Halved'
          side1Points = trip.pointsForHalf
          side2Points = trip.pointsForHalf
        }

        await prisma.match.update({
          where: { id: match.id },
          data: { status: 'COMPLETE', resultText, side1Points, side2Points },
        })
        console.log(`  R${round.roundNumber} M${match.matchNumber}: ${resultText} (${side1Points}-${side2Points})`)
        continue
      }

      // Match play
      let side1Lead = 0
      let holesPlayed = 0
      let matchClosedAt: number | null = null
      const isBestBall = format === 'FOURBALL' || format === 'SHAMBLE'

      for (const hole of holes) {
        let s1Net: number | null = null
        let s2Net: number | null = null

        if (isBestBall) {
          const s1Nets = side1.flatMap(p => p.scores.filter(s => s.holeId === hole.id).map(s => s.netScore))
          const s2Nets = side2.flatMap(p => p.scores.filter(s => s.holeId === hole.id).map(s => s.netScore))
          s1Net = s1Nets.length > 0 ? Math.min(...s1Nets) : null
          s2Net = s2Nets.length > 0 ? Math.min(...s2Nets) : null
        } else {
          const s1Score = side1[0]?.scores.find(s => s.holeId === hole.id)
          const s2Score = side2[0]?.scores.find(s => s.holeId === hole.id)
          s1Net = s1Score?.netScore ?? null
          s2Net = s2Score?.netScore ?? null
        }

        if (s1Net === null || s2Net === null) continue
        holesPlayed++

        if (s1Net < s2Net) side1Lead++
        else if (s2Net < s1Net) side1Lead--

        const holesRemaining = 18 - holesPlayed
        if (Math.abs(side1Lead) > holesRemaining && holesRemaining > 0) {
          matchClosedAt = holesPlayed
          break
        }
      }

      let resultText: string
      let side1Points = 0
      let side2Points = 0

      if (side1Lead === 0) {
        resultText = 'Halved'
        side1Points = trip.pointsForHalf
        side2Points = trip.pointsForHalf
      } else if (matchClosedAt !== null) {
        const remaining = 18 - matchClosedAt
        resultText = `${Math.abs(side1Lead)}&${remaining}`
        if (side1Lead > 0) side1Points = trip.pointsForWin
        else side2Points = trip.pointsForWin
      } else {
        resultText = `${Math.abs(side1Lead)}UP`
        if (side1Lead > 0) side1Points = trip.pointsForWin
        else side2Points = trip.pointsForWin
      }

      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'COMPLETE', resultText, side1Points, side2Points },
      })
      console.log(`  R${round.roundNumber} M${match.matchNumber}: ${resultText} (${side1Points}-${side2Points})`)
    }
  }

  // 4. Reset verification status on all rounds
  await prisma.round.updateMany({
    data: { verificationStatus: 'UNVERIFIED', verifiedAt: null, verifiedById: null },
  })
  console.log('\nAll rounds reset to UNVERIFIED')

  console.log('\nDone! All 28 matches populated with realistic scores.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
