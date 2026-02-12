import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateSkins, HoleSkinScore } from '@/lib/golf'

// GET /api/trips/[tripId]/player-stats
// Aggregate per-player stats across all rounds/matches, including MVP
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

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
        match: { select: { id: true, side1Points: true, side2Points: true } },
      },
    })

    // Load all scores with match/side info (for holesWon + scoring stats)
    const scores = await prisma.score.findMany({
      where: {
        tripPlayer: { tripId: params.tripId },
      },
      include: {
        hole: { select: { id: true, par: true } },
        matchPlayer: { select: { matchId: true, side: true, tripPlayerId: true } },
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
      totalNet: number
      totalPar: number
      holesWon: number
      holesLost: number
      holesHalved: number
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
        matchPoints: 0, holesPlayed: 0, totalGross: 0, totalNet: 0, totalPar: 0,
        holesWon: 0, holesLost: 0, holesHalved: 0,
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
      stats.totalNet += score.netScore
      stats.totalPar += score.hole.par

      const diff = score.grossScore - score.hole.par
      if (diff <= -2) stats.eagles++
      else if (diff === -1) stats.birdies++
      else if (diff === 0) stats.pars++
      else if (diff === 1) stats.bogeys++
      else stats.doublesPlus++
    }

    // Holes won/lost/halved — compare best net per side per match+hole
    // Group scores by (matchId, holeId) → { side1Nets[], side2Nets[], side1Players[], side2Players[] }
    const holeGroups = new Map<string, {
      side1Nets: number[]
      side2Nets: number[]
      side1Players: string[]
      side2Players: string[]
    }>()

    for (const score of scores) {
      const key = `${score.matchPlayer.matchId}:${score.hole.id}`
      if (!holeGroups.has(key)) {
        holeGroups.set(key, { side1Nets: [], side2Nets: [], side1Players: [], side2Players: [] })
      }
      const group = holeGroups.get(key)!
      if (score.matchPlayer.side === 1) {
        group.side1Nets.push(score.netScore)
        group.side1Players.push(score.matchPlayer.tripPlayerId)
      } else {
        group.side2Nets.push(score.netScore)
        group.side2Players.push(score.matchPlayer.tripPlayerId)
      }
    }

    for (const group of Array.from(holeGroups.values())) {
      if (group.side1Nets.length === 0 || group.side2Nets.length === 0) continue
      const best1 = Math.min(...group.side1Nets)
      const best2 = Math.min(...group.side2Nets)

      if (best1 < best2) {
        for (const pid of group.side1Players) { const s = statsMap.get(pid); if (s) s.holesWon++ }
        for (const pid of group.side2Players) { const s = statsMap.get(pid); if (s) s.holesLost++ }
      } else if (best2 < best1) {
        for (const pid of group.side2Players) { const s = statsMap.get(pid); if (s) s.holesWon++ }
        for (const pid of group.side1Players) { const s = statsMap.get(pid); if (s) s.holesLost++ }
      } else {
        for (const pid of [...group.side1Players, ...group.side2Players]) {
          const s = statsMap.get(pid); if (s) s.holesHalved++
        }
      }
    }

    // Build skins opt-in set
    const skinsOptedIn = new Set(tripPlayers.filter(tp => tp.skinsOptIn).map(tp => tp.id))

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

    const scoresByRound = new Map<string, typeof allRoundScores>()
    for (const s of allRoundScores) {
      const rid = s.matchPlayer.match.roundId
      if (!scoresByRound.has(rid)) scoresByRound.set(rid, [])
      scoresByRound.get(rid)!.push(s)
    }

    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    for (const round of skinsRounds) {
      const roundScores = scoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      const holeScoresMap = new Map<string, Map<string, number>>()
      const uniquePlayers = new Set<string>()

      for (const score of roundScores) {
        const tpId = score.matchPlayer.tripPlayerId
        if (!skinsOptedIn.has(tpId)) continue
        const holeId = score.holeId
        if (!holeScoresMap.has(holeId)) holeScoresMap.set(holeId, new Map())
        const holeMap = holeScoresMap.get(holeId)!
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

    // Load MVP config (or use defaults)
    const mvpConfig = await prisma.mVPConfig.findUnique({
      where: { tripId: params.tripId },
    })

    const weights = {
      matchPoints: mvpConfig?.matchPointsWeight ?? 0.24,
      holesWon: mvpConfig?.holesWonWeight ?? 0.24,
      scoring: mvpConfig?.scoringWeight ?? 0.24,
      vsIndex: mvpConfig?.vsIndexWeight ?? 0.24,
      skins: mvpConfig?.skinsWeight ?? 0.04,
      birdies: mvpConfig?.birdiesWeight ?? 0,
      eagles: mvpConfig?.eaglesWeight ?? 0,
    }

    // Build raw player data
    const rawPlayers = tripPlayers.map(tp => {
      const stats = statsMap.get(tp.id)!
      const avgVsPar = stats.holesPlayed > 0
        ? (stats.totalGross - stats.totalPar) / stats.holesPlayed
        : 0
      const netAvgVsPar = stats.holesPlayed > 0
        ? (stats.totalNet - stats.totalPar) / stats.holesPlayed
        : 0

      return {
        tripPlayerId: tp.id,
        name: tp.user.name,
        teamName: tp.team?.name ?? null,
        teamColor: tp.team?.color ?? null,
        handicap: tp.handicapAtTime,
        ...stats,
        avgVsPar: Math.round(avgVsPar * 100) / 100,
        netAvgVsPar: Math.round(netAvgVsPar * 100) / 100,
        skinsMoney: Math.round(stats.skinsMoney * 100) / 100,
      }
    })

    // Compute MVP scores — normalize each stat across players, apply weights
    const activePlayers = rawPlayers.filter(p => p.holesPlayed > 0)

    const normalize = (values: number[], higherIsBetter: boolean): number[] => {
      if (values.length === 0) return []
      const min = Math.min(...values)
      const max = Math.max(...values)
      if (max === min) return values.map(() => 50)
      return values.map(v => {
        const norm = ((v - min) / (max - min)) * 100
        return higherIsBetter ? norm : 100 - norm
      })
    }

    if (activePlayers.length > 0) {
      const normMatchPts = normalize(activePlayers.map(p => p.matchPoints), true)
      const normHolesWon = normalize(activePlayers.map(p => p.holesWon), true)
      const normScoring = normalize(activePlayers.map(p => p.avgVsPar), false)
      const normVsIndex = normalize(activePlayers.map(p => p.netAvgVsPar), false)
      const normSkins = normalize(activePlayers.map(p => p.skinsWon), true)
      const normBirdies = normalize(activePlayers.map(p => p.birdies + p.eagles), true)
      const normEagles = normalize(activePlayers.map(p => p.eagles), true)

      for (let i = 0; i < activePlayers.length; i++) {
        const mvpScore =
          normMatchPts[i] * weights.matchPoints +
          normHolesWon[i] * weights.holesWon +
          normScoring[i] * weights.scoring +
          normVsIndex[i] * weights.vsIndex +
          normSkins[i] * weights.skins +
          normBirdies[i] * weights.birdies +
          normEagles[i] * weights.eagles

        ;(activePlayers[i] as any).mvpScore = Math.round(mvpScore * 10) / 10
      }
    }

    // Build final response
    const players = rawPlayers.map(p => ({
      tripPlayerId: p.tripPlayerId,
      name: p.name,
      teamName: p.teamName,
      teamColor: p.teamColor,
      handicap: p.handicap,
      matchesPlayed: p.matchesPlayed,
      matchesWon: p.matchesWon,
      matchesLost: p.matchesLost,
      matchesHalved: p.matchesHalved,
      matchPoints: p.matchPoints,
      holesPlayed: p.holesPlayed,
      holesWon: p.holesWon,
      holesLost: p.holesLost,
      holesHalved: p.holesHalved,
      avgVsPar: p.avgVsPar,
      netAvgVsPar: p.netAvgVsPar,
      birdies: p.birdies,
      pars: p.pars,
      bogeys: p.bogeys,
      doublesPlus: p.doublesPlus,
      eagles: p.eagles,
      skinsWon: p.skinsWon,
      skinsMoney: p.skinsMoney,
      mvpScore: (p as any).mvpScore ?? null,
    }))

    // Sort by MVP score desc (null last), then matchPoints desc
    players.sort((a, b) => {
      if (a.mvpScore !== null && b.mvpScore !== null) return b.mvpScore - a.mvpScore
      if (a.mvpScore !== null) return -1
      if (b.mvpScore !== null) return 1
      return b.matchPoints - a.matchPoints
    })

    return successResponse({ players, weights })
  } catch (error) {
    return handleApiError(error)
  }
}
