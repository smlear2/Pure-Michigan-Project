import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { createMatchSchema } from '@/lib/validators/match'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { courseHandicap, playingHandicap } from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/matches
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

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

    // Get the round with its tee (for slope rating)
    const round = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
      include: { tee: true },
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

    // Compute course handicaps for each player
    const playerHandicaps = tripPlayers.map(tp => ({
      tripPlayerId: tp.id,
      courseHdcp: courseHandicap(tp.handicapAtTime, round.tee.slope),
    }))

    // Find the lowest course handicap in the group
    const lowestCourseHdcp = Math.min(...playerHandicaps.map(p => p.courseHdcp))

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
        const hdcp = playerHandicaps.find(p => p.tripPlayerId === player.tripPlayerId)!
        const playingHdcp = playingHandicap(hdcp.courseHdcp, lowestCourseHdcp)

        await tx.matchPlayer.create({
          data: {
            matchId: newMatch.id,
            tripPlayerId: player.tripPlayerId,
            courseHandicap: hdcp.courseHdcp,
            playingHandicap: playingHdcp,
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
