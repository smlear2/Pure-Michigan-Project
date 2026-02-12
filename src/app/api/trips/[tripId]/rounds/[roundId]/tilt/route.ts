import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateTilt, TiltHoleScore } from '@/lib/golf'

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
            defaultTiltCarryover: true,
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
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    })

    // Build hole scores for TILT calculation
    // Group by hole, deduplicate by tripPlayerId
    const holeScoresMap = new Map<string, Map<string, { netScore: number; par: number }>>()

    for (const score of scores) {
      if (!score.matchPlayer.tripPlayer.tiltOptIn) continue
      const holeId = score.holeId
      if (!holeScoresMap.has(holeId)) {
        holeScoresMap.set(holeId, new Map())
      }
      const holeMap = holeScoresMap.get(holeId)!
      const tripPlayerId = score.matchPlayer.tripPlayerId
      if (!holeMap.has(tripPlayerId)) {
        holeMap.set(tripPlayerId, { netScore: score.netScore, par: score.hole.par })
      }
    }

    // Convert to TiltHoleScore format ordered by hole number
    const holeScores: TiltHoleScore[] = round.tee.holes.map(hole => {
      const holeMap = holeScoresMap.get(hole.id)
      if (!holeMap) {
        return { holeNumber: hole.number, playerScores: [] }
      }
      return {
        holeNumber: hole.number,
        playerScores: Array.from(holeMap.entries()).map(([playerId, data]) => ({
          playerId,
          netScore: data.netScore,
          par: data.par,
        })),
      }
    })

    // Count unique opted-in players
    const uniquePlayers = new Set<string>()
    for (const score of scores) {
      if (!score.matchPlayer.tripPlayer.tiltOptIn) continue
      uniquePlayers.add(score.matchPlayer.tripPlayerId)
    }

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'TILT', isActive: true },
    })

    const entryFee = wagerConfig?.entryFee ?? round.trip.defaultTiltEntryFee

    // Read point overrides from round formatConfig if present
    const formatConfig = round.formatConfig as any
    const pointOverrides = formatConfig?.tiltPoints ?? undefined

    const result = calculateTilt(holeScores, entryFee, uniquePlayers.size, {
      points: pointOverrides,
    })

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

    const enrichedPlayers = result.players.map(p => ({
      ...p,
      playerName: tripPlayerMap.get(p.playerId)?.name ?? 'Unknown',
      teamName: tripPlayerMap.get(p.playerId)?.teamName ?? null,
      teamColor: tripPlayerMap.get(p.playerId)?.teamColor ?? null,
    }))

    return successResponse({
      ...result,
      players: enrichedPlayers,
      entryFee,
      playerCount: uniquePlayers.size,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
