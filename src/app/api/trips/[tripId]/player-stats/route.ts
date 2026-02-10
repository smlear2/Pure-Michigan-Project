import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateSkins, HoleSkinScore } from '@/lib/golf'

// GET /api/trips/[tripId]/player-stats
// Aggregate per-player stats across all rounds/matches
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Load trip players with user/team info
    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      include: {
        user: { select: { name: true } },
        team: { select: { name: true, color: true } },
      },
    })

    // Load all match players for this trip with match results
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: {
        tripPlayer: { tripId: params.tripId },
        match: { status: 'COMPLETE' },
      },
      include: {
        match: { select: { side1Points: true, side2Points: true } },
      },
    })

    // Load all scores for this trip with hole data
    const scores = await prisma.score.findMany({
      where: {
        tripPlayer: { tripId: params.tripId },
      },
      include: {
        hole: { select: { par: true } },
      },
    })

    // Build per-player stats
    const statsMap = new Map<string, {
      matchesPlayed: number
      matchesWon: number
      matchesLost: number
      matchesHalved: number
      matchPoints: number
      holesPlayed: number
      totalGross: number
      totalPar: number
      birdies: number
      eagles: number
      pars: number
      bogeys: number
      doublesPlus: number
      skinsWon: number
      skinsMoney: number
    }>()

    for (const tp of tripPlayers) {
      statsMap.set(tp.id, {
        matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesHalved: 0,
        matchPoints: 0, holesPlayed: 0, totalGross: 0, totalPar: 0,
        birdies: 0, eagles: 0, pars: 0, bogeys: 0, doublesPlus: 0,
        skinsWon: 0, skinsMoney: 0,
      })
    }

    // Match record and points
    for (const mp of matchPlayers) {
      const stats = statsMap.get(mp.tripPlayerId)
      if (!stats) continue

      stats.matchesPlayed++

      const myPoints = mp.side === 1 ? mp.match.side1Points : mp.match.side2Points
      const theirPoints = mp.side === 1 ? mp.match.side2Points : mp.match.side1Points
      stats.matchPoints += myPoints

      if (myPoints > theirPoints) stats.matchesWon++
      else if (myPoints < theirPoints) stats.matchesLost++
      else stats.matchesHalved++
    }

    // Scoring stats
    for (const score of scores) {
      const stats = statsMap.get(score.tripPlayerId)
      if (!stats) continue

      stats.holesPlayed++
      stats.totalGross += score.grossScore
      stats.totalPar += score.hole.par

      const diff = score.grossScore - score.hole.par
      if (diff <= -2) stats.eagles++
      else if (diff === -1) stats.birdies++
      else if (diff === 0) stats.pars++
      else if (diff === 1) stats.bogeys++
      else stats.doublesPlus++
    }

    // Skins aggregation — compute per round
    const skinsRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, skinsEnabled: true },
      include: {
        trip: { select: { defaultSkinsEntryFee: true, defaultSkinsCarryover: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
    })

    const allRoundScores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { round: { tripId: params.tripId, skinsEnabled: true } },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: { tripPlayerId: true, match: { select: { roundId: true } } },
        },
      },
    })

    // Group scores by round
    const scoresByRound = new Map<string, typeof allRoundScores>()
    for (const s of allRoundScores) {
      const rid = s.matchPlayer.match.roundId
      if (!scoresByRound.has(rid)) scoresByRound.set(rid, [])
      scoresByRound.get(rid)!.push(s)
    }

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    for (const round of skinsRounds) {
      const roundScores = scoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      // Build hole scores map (same logic as skins API)
      const holeScoresMap = new Map<string, Map<string, number>>()
      const uniquePlayers = new Set<string>()

      for (const score of roundScores) {
        const holeId = score.holeId
        if (!holeScoresMap.has(holeId)) holeScoresMap.set(holeId, new Map())
        const holeMap = holeScoresMap.get(holeId)!
        const tpId = score.matchPlayer.tripPlayerId
        uniquePlayers.add(tpId)
        if (!holeMap.has(tpId)) holeMap.set(tpId, score.netScore)
      }

      const holeScores: HoleSkinScore[] = round.tee.holes.map(hole => {
        const holeMap = holeScoresMap.get(hole.id)
        if (!holeMap) return { holeNumber: hole.number, playerScores: [] }
        return {
          holeNumber: hole.number,
          playerScores: Array.from(holeMap.entries()).map(([playerId, netScore]) => ({
            playerId,
            netScore,
          })),
        }
      })

      const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
      const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover
      const result = calculateSkins(holeScores, entryFee, uniquePlayers.size, carryover)

      for (const pt of result.playerTotals) {
        const stats = statsMap.get(pt.playerId)
        if (!stats) continue
        stats.skinsWon += pt.skinsWon
        stats.skinsMoney += pt.moneyWon
      }
    }

    // Build response
    const players = tripPlayers.map(tp => {
      const stats = statsMap.get(tp.id)!
      const avgVsPar = stats.holesPlayed > 0
        ? Math.round(((stats.totalGross - stats.totalPar) / stats.holesPlayed) * 100) / 100
        : 0

      return {
        tripPlayerId: tp.id,
        name: tp.user.name,
        teamName: tp.team?.name ?? null,
        teamColor: tp.team?.color ?? null,
        handicap: tp.handicapAtTime,
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesLost,
        matchesHalved: stats.matchesHalved,
        matchPoints: stats.matchPoints,
        holesPlayed: stats.holesPlayed,
        avgVsPar,
        birdies: stats.birdies,
        pars: stats.pars,
        bogeys: stats.bogeys,
        doublesPlus: stats.doublesPlus,
        eagles: stats.eagles,
        skinsWon: stats.skinsWon,
        skinsMoney: Math.round(stats.skinsMoney * 100) / 100,
      }
    })

    // Sort: matchPoints desc, then avgVsPar asc
    players.sort((a, b) => {
      if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints
      return a.avgVsPar - b.avgVsPar
    })

    return successResponse({ players })
  } catch (error) {
    return handleApiError(error)
  }
}
