import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { updateTripSchema } from '@/lib/validators/trip'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId] — get trip detail with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        teams: { orderBy: { sortOrder: 'asc' } },
        tripPlayers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, handicapIndex: true },
            },
          },
        },
        courses: {
          include: {
            course: {
              include: {
                tees: {
                  include: { holes: { orderBy: { number: 'asc' } } },
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
        },
        rounds: {
          include: { tee: { include: { course: true } } },
          orderBy: { roundNumber: 'asc' },
        },
      },
    })

    if (!trip) return errorResponse('Trip not found', 'NOT_FOUND', 404)

    return successResponse(trip)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/trips/[tripId] — update trip settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can edit trip settings', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = updateTripSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.year !== undefined) updateData.year = validated.year
    if (validated.startDate !== undefined) updateData.startDate = new Date(validated.startDate)
    if (validated.endDate !== undefined) updateData.endDate = new Date(validated.endDate)
    if (validated.location !== undefined) updateData.location = validated.location || null
    if (validated.description !== undefined) updateData.description = validated.description || null
    if (validated.isTeamEvent !== undefined) updateData.isTeamEvent = validated.isTeamEvent
    if (validated.pointsForWin !== undefined) updateData.pointsForWin = validated.pointsForWin
    if (validated.pointsForHalf !== undefined) updateData.pointsForHalf = validated.pointsForHalf
    if (validated.pointsToWin !== undefined) updateData.pointsToWin = validated.pointsToWin

    const trip = await prisma.trip.update({
      where: { id: params.tripId },
      data: updateData,
    })

    return successResponse(trip)
  } catch (error) {
    return handleApiError(error)
  }
}
