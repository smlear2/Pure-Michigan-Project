import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { updateMatchSchema } from '@/lib/validators/match'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const match = await prisma.match.findFirst({
      where: {
        id: params.matchId,
        roundId: params.roundId,
        round: { tripId: params.tripId },
      },
      include: {
        round: {
          include: {
            tee: {
              include: {
                course: { select: { id: true, name: true } },
                holes: { orderBy: { number: 'asc' } },
              },
            },
            trip: {
              select: {
                id: true,
                name: true,
                pointsForWin: true,
                pointsForHalf: true,
                defaultMaxScore: true,
              },
            },
          },
        },
        players: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
                team: { select: { id: true, name: true, color: true } },
              },
            },
            scores: {
              include: { hole: true },
              orderBy: { hole: { number: 'asc' } },
            },
          },
          orderBy: [{ side: 'asc' }],
        },
      },
    })

    if (!match) return errorResponse('Match not found', 'NOT_FOUND', 404)

    return successResponse(match)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can update matches', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = updateMatchSchema.parse(body)

    const match = await prisma.match.update({
      where: { id: params.matchId },
      data: validated,
      include: {
        players: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { id: true, name: true } },
                team: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(match)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can delete matches', 'FORBIDDEN', 403)

    await prisma.match.delete({
      where: { id: params.matchId },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
