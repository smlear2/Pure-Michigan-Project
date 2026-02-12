import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer, requireTripMember } from '@/lib/auth'
import { createMatchSchema } from '@/lib/validators/match'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { courseHandicap, computeMatchHandicaps, skinsHandicap } from '@/lib/golf'
import type { HandicapConfig } from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/matches
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const matches = await prisma.match.findMany({
      where: { roundId: params.roundId, round: { tripId: params.tripId } },
      include: {
        players: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
                team: { select: { id: true, name: true, color: true } },
              },
            },
            scores: {
              include: {
                hole: true,
              },
              orderBy: { hole: { number: 'asc' } },
            },
          },
          orderBy: [{ side: 'asc' }],
        },
      },
      orderBy: { matchNumber: 'asc' },
    })

    return successResponse(matches)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/rounds/[roundId]/matches
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can create matches', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = createMatchSchema.parse(body)

    // Get the round with its tee (for slope, rating, holes)
    const round = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
      include: { tee: { include: { holes: true } } },
    })
    if (!round) return errorResponse('Round not found', 'NOT_FOUND', 404)

    // Get all trip players in this match to compute handicaps
    const tripPlayerIds = validated.players.map(p => p.tripPlayerId)
    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { id: { in: tripPlayerIds }, tripId: params.tripId },
    })

    if (tripPlayers.length !== tripPlayerIds.length) {
      return errorResponse('One or more players not found in this trip', 'VALIDATION_ERROR', 400)
    }

    // Load trip handicap config
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      select: { handicapConfig: true },
    })

    const hdcpConfig = trip?.handicapConfig as HandicapConfig | null

    // Build handicap inputs with side info
    let handicapInputs
    let effectiveConfig: HandicapConfig | null

    if (hdcpConfig?.useUnifiedFormula) {
      // Unified formula: use skinsHandicap() as base (80% + rating-par already applied, capped)
      // Then computeMatchHandicaps just does off-the-low + team combos
      const par = round.tee.holes.reduce((sum: number, h: { par: number }) => sum + h.par, 0)
      handicapInputs = validated.players.map(p => {
        const tp = tripPlayers.find(t => t.id === p.tripPlayerId)!
        return {
          tripPlayerId: tp.id,
          courseHdcp: skinsHandicap(tp.handicapAtTime, round.tee.slope, round.tee.rating, par, 20, 'round'),
          side: p.side,
        }
      })
      // Percentage=100 and no cap since skinsHandicap already handles both
      effectiveConfig = {
        ...hdcpConfig,
        percentage: 100,
        maxHandicap: null,
      }
    } else {
      // Legacy formula: courseHandicap + percentage + cap applied by computeMatchHandicaps
      handicapInputs = validated.players.map(p => {
        const tp = tripPlayers.find(t => t.id === p.tripPlayerId)!
        return {
          tripPlayerId: tp.id,
          courseHdcp: courseHandicap(tp.handicapAtTime, round.tee.slope),
          side: p.side,
        }
      })
      effectiveConfig = hdcpConfig
    }

    // Compute format-aware playing handicaps
    const handicapResults = computeMatchHandicaps(
      handicapInputs,
      round.format,
      effectiveConfig,
    )

    // Create match with match players in a transaction
    const match = await prisma.$transaction(async (tx) => {
      const newMatch = await tx.match.create({
        data: {
          roundId: params.roundId,
          matchNumber: validated.matchNumber,
        },
      })

      // Create match players with computed handicaps
      for (const player of validated.players) {
        const result = handicapResults.find(r => r.tripPlayerId === player.tripPlayerId)!

        await tx.matchPlayer.create({
          data: {
            matchId: newMatch.id,
            tripPlayerId: player.tripPlayerId,
            courseHandicap: result.courseHandicap,
            playingHandicap: result.playingHandicap,
            side: player.side,
          },
        })
      }

      // Return full match with includes
      return tx.match.findUnique({
        where: { id: newMatch.id },
        include: {
          players: {
            include: {
              tripPlayer: {
                include: {
                  user: { select: { id: true, name: true, avatarUrl: true } },
                  team: { select: { id: true, name: true, color: true } },
                },
              },
            },
            orderBy: [{ side: 'asc' }],
          },
        },
      })
    })

    return successResponse(match, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
