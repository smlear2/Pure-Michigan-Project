import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateSkins, HoleSkinScore, calculateTilt, TiltHoleScore } from '@/lib/golf'

// GET /api/trips/[tripId]/ledger — gambling P&L per player
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Load trip players
    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      include: {
        user: { select: { name: true } },
        team: { select: { name: true, color: true } },
      },
    })

    // Load skins-enabled rounds
    const skinsRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, skinsEnabled: true },
      include: {
        trip: { select: { defaultSkinsEntryFee: true, defaultSkinsCarryover: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
      orderBy: { roundNumber: 'asc' },
    })

    // Load all scores for skins rounds
    const allScores = await prisma.score.findMany({
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

    const scoresByRound = new Map<string, typeof allScores>()
    for (const s of allScores) {
      const rid = s.matchPlayer.match.roundId
      if (!scoresByRound.has(rid)) scoresByRound.set(rid, [])
      scoresByRound.get(rid)!.push(s)
    }

    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    // Per-player per-round breakdown
    const playerRoundMap = new Map<string, { roundName: string; skinsWon: number; moneyWon: number; entryFee: number }[]>()
    for (const tp of tripPlayers) {
      playerRoundMap.set(tp.id, [])
    }

    for (const round of skinsRounds) {
      const roundScores = scoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

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

      // Record per-player results for this round
      for (const tpId of Array.from(uniquePlayers)) {
        const pt = result.playerTotals.find(p => p.playerId === tpId)
        const breakdown = playerRoundMap.get(tpId)
        if (breakdown) {
          breakdown.push({
            roundName: round.name || `Round ${round.roundNumber}`,
            skinsWon: pt?.skinsWon ?? 0,
            moneyWon: pt?.moneyWon ?? 0,
            entryFee,
          })
        }
      }
    }

    // --- TILT P&L ---
    const tiltRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, tiltEnabled: true },
      include: {
        trip: { select: { defaultTiltEntryFee: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
      orderBy: { roundNumber: 'asc' },
    })

    const tiltScores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { round: { tripId: params.tripId, tiltEnabled: true } },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: { tripPlayerId: true, match: { select: { roundId: true } } },
        },
      },
    })

    const tiltScoresByRound = new Map<string, typeof tiltScores>()
    for (const s of tiltScores) {
      const rid = s.matchPlayer.match.roundId
      if (!tiltScoresByRound.has(rid)) tiltScoresByRound.set(rid, [])
      tiltScoresByRound.get(rid)!.push(s)
    }

    const tiltWagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'TILT', isActive: true },
    })

    const playerTiltMap = new Map<string, { roundName: string; totalPoints: number; entryFee: number; isWinner: boolean }[]>()
    for (const tp of tripPlayers) {
      playerTiltMap.set(tp.id, [])
    }

    for (const round of tiltRounds) {
      const roundScores = tiltScoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      const holeScoresMap = new Map<string, Map<string, { netScore: number; par: number }>>()
      const uniqueTiltPlayers = new Set<string>()

      for (const score of roundScores) {
        const holeId = score.holeId
        if (!holeScoresMap.has(holeId)) holeScoresMap.set(holeId, new Map())
        const holeMap = holeScoresMap.get(holeId)!
        const tpId = score.matchPlayer.tripPlayerId
        uniqueTiltPlayers.add(tpId)
        if (!holeMap.has(tpId)) {
          holeMap.set(tpId, { netScore: score.netScore, par: score.hole.par })
        }
      }

      const tiltHoleScores: TiltHoleScore[] = round.tee.holes.map(hole => {
        const holeMap = holeScoresMap.get(hole.id)
        if (!holeMap) return { holeNumber: hole.number, playerScores: [] }
        return {
          holeNumber: hole.number,
          playerScores: Array.from(holeMap.entries()).map(([playerId, data]) => ({
            playerId,
            netScore: data.netScore,
            par: data.par,
          })),
        }
      })

      const tiltEntryFee = tiltWagerConfig?.entryFee ?? round.trip.defaultTiltEntryFee
      const tiltResult = calculateTilt(tiltHoleScores, tiltEntryFee, uniqueTiltPlayers.size)

      // Winner takes all
      const winnerId = tiltResult.players.length > 0 ? tiltResult.players[0].playerId : null

      for (const tpId of Array.from(uniqueTiltPlayers)) {
        const tiltPlayer = tiltResult.players.find(p => p.playerId === tpId)
        const breakdown = playerTiltMap.get(tpId)
        if (breakdown) {
          breakdown.push({
            roundName: round.name || `Round ${round.roundNumber}`,
            totalPoints: tiltPlayer?.totalPoints ?? 0,
            entryFee: tiltEntryFee,
            isWinner: tpId === winnerId,
          })
        }
      }
    }

    // Build response
    const players = tripPlayers.map(tp => {
      const rounds = playerRoundMap.get(tp.id) || []
      const totalWon = rounds.reduce((s, r) => s + r.moneyWon, 0)
      const totalEntry = rounds.reduce((s, r) => s + r.entryFee, 0)
      const totalSkins = rounds.reduce((s, r) => s + r.skinsWon, 0)

      const tiltRoundsData = playerTiltMap.get(tp.id) || []
      const tiltTotalEntry = tiltRoundsData.reduce((s, r) => s + r.entryFee, 0)
      const tiltWinnings = tiltRoundsData.reduce((s, r) => {
        if (r.isWinner) {
          // Winner takes pot for that round: entryFee * number of players in that round
          // We need player count — stored indirectly. For simplicity, find from tiltRounds
          return s + r.entryFee // placeholder, actual pot computed below
        }
        return s
      }, 0)

      // Compute TILT net: for each round, winner gets pot - entry, losers get -entry
      let tiltNet = 0
      for (const r of tiltRoundsData) {
        if (r.isWinner) {
          // Find the round to get player count
          const matchingRound = tiltRounds.find(tr => (tr.name || `Round ${tr.roundNumber}`) === r.roundName)
          const roundTiltScores = matchingRound ? (tiltScoresByRound.get(matchingRound.id) || []) : []
          const roundPlayerCount = new Set(roundTiltScores.map(s => s.matchPlayer.tripPlayerId)).size
          const pot = r.entryFee * roundPlayerCount
          tiltNet += pot - r.entryFee
        } else {
          tiltNet -= r.entryFee
        }
      }

      return {
        tripPlayerId: tp.id,
        name: tp.user.name,
        teamName: tp.team?.name ?? null,
        teamColor: tp.team?.color ?? null,
        totalSkinsWon: totalSkins,
        totalMoneyWon: Math.round(totalWon * 100) / 100,
        totalEntryFees: Math.round(totalEntry * 100) / 100,
        skinsNet: Math.round((totalWon - totalEntry) * 100) / 100,
        roundBreakdown: rounds,
        tiltNet: Math.round(tiltNet * 100) / 100,
        tiltRounds: tiltRoundsData,
      }
    })

    players.sort((a, b) => (b.skinsNet + b.tiltNet) - (a.skinsNet + a.tiltNet))

    return successResponse({ players })
  } catch (error) {
    return handleApiError(error)
  }
}
