import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { computeTiltForRound, HandicapConfig } from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/tilt
// Compute TILT results from all scores in the round
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    // Load round with trip tilt settings
    const round = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
      include: {
        trip: {
          select: {
            defaultTiltEntryFee: true,
            handicapConfig: true,
          },
        },
        tee: {
          include: { holes: { orderBy: { number: 'asc' } } },
        },
      },
    })

    if (!round) return errorResponse('Round not found', 'NOT_FOUND', 404)

    if (!round.tiltEnabled) {
      return successResponse({ message: 'TILT not enabled for this round', results: null })
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
                tiltOptIn: true,
                handicapAtTime: true,
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    })

    // Build player inputs
    const playerMap = new Map<string, { handicapIndex: number; tiltOptIn: boolean }>()
    for (const s of scores) {
      const tpId = s.matchPlayer.tripPlayerId
      if (!playerMap.has(tpId)) {
        playerMap.set(tpId, {
          handicapIndex: s.matchPlayer.tripPlayer.handicapAtTime ?? 0,
          tiltOptIn: s.matchPlayer.tripPlayer.tiltOptIn,
        })
      }
    }

    const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'TILT', isActive: true },
    })

    const entryFee = wagerConfig?.entryFee ?? round.trip.defaultTiltEntryFee
    const optedInCount = Array.from(playerMap.values()).filter(p => p.tiltOptIn).length

    const { tiltResult } = computeTiltForRound(
      round.tee,
      scores.map(s => ({
        holeId: s.holeId,
        grossScore: s.grossScore,
        tripPlayerId: s.matchPlayer.tripPlayerId,
      })),
      Array.from(playerMap.entries()).map(([tpId, p]) => ({
        tripPlayerId: tpId,
        ...p,
      })),
      hdcpConfig,
      entryFee,
      optedInCount,
    )

    // Enrich player results with names
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

    const enrichedPlayers = tiltResult.players.map(p => ({
      ...p,
      playerName: tripPlayerMap.get(p.playerId)?.name ?? 'Unknown',
      teamName: tripPlayerMap.get(p.playerId)?.teamName ?? null,
      teamColor: tripPlayerMap.get(p.playerId)?.teamColor ?? null,
    }))

    return successResponse({
      ...tiltResult,
      players: enrichedPlayers,
      entryFee,
      playerCount: optedInCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
