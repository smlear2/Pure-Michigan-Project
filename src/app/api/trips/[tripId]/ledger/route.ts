import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateSkins, HoleSkinScore } from '@/lib/golf'

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

    // Build response
    const players = tripPlayers.map(tp => {
      const rounds = playerRoundMap.get(tp.id) || []
      const totalWon = rounds.reduce((s, r) => s + r.moneyWon, 0)
      const totalEntry = rounds.reduce((s, r) => s + r.entryFee, 0)
      const totalSkins = rounds.reduce((s, r) => s + r.skinsWon, 0)

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
      }
    })

    players.sort((a, b) => b.skinsNet - a.skinsNet)

    return successResponse({ players })
  } catch (error) {
    return handleApiError(error)
  }
}
