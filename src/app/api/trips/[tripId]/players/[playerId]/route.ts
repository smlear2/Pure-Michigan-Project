import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { updatePlayerSchema } from '@/lib/validators/player'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// PUT /api/trips/[tripId]/players/[playerId] — update player (team, handicap)
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; playerId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = updatePlayerSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.teamId !== undefined) updateData.teamId = validated.teamId || null
    if (validated.handicapIndex !== undefined) updateData.handicapAtTime = validated.handicapIndex ?? 0

    const tripPlayer = await prisma.tripPlayer.update({
      where: { id: params.playerId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, handicapIndex: true, ghinNumber: true },
        },
        team: { select: { id: true, name: true, color: true } },
      },
    })

    return successResponse(tripPlayer)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/players/[playerId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; playerId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    await prisma.tripPlayer.delete({
      where: { id: params.playerId },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
