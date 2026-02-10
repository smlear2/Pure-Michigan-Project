import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateSkins, HoleSkinScore } from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/skins
// Compute skins from all scores in the round
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Load round with trip skins settings
    const round = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
      include: {
        trip: {
          select: {
            defaultSkinsEntryFee: true,
            defaultSkinsCarryover: true,
          },
        },
        tee: {
          include: { holes: { orderBy: { number: 'asc' } } },
        },
      },
    })

    if (!round) return errorResponse('Round not found', 'NOT_FOUND', 404)

    if (!round.skinsEnabled) {
      return successResponse({ message: 'Skins not enabled for this round', results: null })
    }

    // Get all scores in this round across all matches
    const scores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { roundId: params.roundId },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: {
            tripPlayerId: true,
            tripPlayer: {
              select: {
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    })

    // Build hole scores for skins calculation
    // Group by hole, deduplicate by tripPlayerId (a player might be in multiple matches — take first)
    const holeScoresMap = new Map<string, Map<string, number>>()

    for (const score of scores) {
      const holeId = score.holeId
      if (!holeScoresMap.has(holeId)) {
        holeScoresMap.set(holeId, new Map())
      }
      const holeMap = holeScoresMap.get(holeId)!
      const tripPlayerId = score.matchPlayer.tripPlayerId
      // Use first occurrence (shouldn't have duplicates normally)
      if (!holeMap.has(tripPlayerId)) {
        holeMap.set(tripPlayerId, score.netScore)
      }
    }

    // Convert to HoleSkinScore format ordered by hole number
    const holeScores: HoleSkinScore[] = round.tee.holes.map(hole => {
      const holeMap = holeScoresMap.get(hole.id)
      if (!holeMap) {
        return { holeNumber: hole.number, playerScores: [] }
      }
      return {
        holeNumber: hole.number,
        playerScores: Array.from(holeMap.entries()).map(([playerId, netScore]) => ({
          playerId,
          netScore,
        })),
      }
    })

    // Count unique players
    const uniquePlayers = new Set<string>()
    for (const score of scores) {
      uniquePlayers.add(score.matchPlayer.tripPlayerId)
    }

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
    const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover

    const result = calculateSkins(holeScores, entryFee, uniquePlayers.size, carryover)

    // Enrich player totals with names
    const tripPlayerMap = new Map<string, { name: string; teamName: string | null; teamColor: string | null }>()
    for (const score of scores) {
      const tp = score.matchPlayer
      if (!tripPlayerMap.has(tp.tripPlayerId)) {
        tripPlayerMap.set(tp.tripPlayerId, {
          name: tp.tripPlayer.user.name,
          teamName: tp.tripPlayer.team?.name ?? null,
          teamColor: tp.tripPlayer.team?.color ?? null,
        })
      }
    }

    const enrichedTotals = result.playerTotals.map(pt => ({
      ...pt,
      playerName: tripPlayerMap.get(pt.playerId)?.name ?? 'Unknown',
      teamName: tripPlayerMap.get(pt.playerId)?.teamName ?? null,
      teamColor: tripPlayerMap.get(pt.playerId)?.teamColor ?? null,
    }))

    return successResponse({
      ...result,
      playerTotals: enrichedTotals,
      entryFee,
      carryover,
      playerCount: uniquePlayers.size,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
