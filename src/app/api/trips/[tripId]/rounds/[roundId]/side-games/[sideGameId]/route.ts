import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { z } from 'zod'

const updateSideGameSchema = z.object({
  winnerId: z.string().optional(),
  measurement: z.number().positive().optional(),
  unit: z.enum(['FEET', 'YARDS', 'INCHES']).optional(),
})

// PUT /api/trips/[tripId]/rounds/[roundId]/side-games/[sideGameId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; sideGameId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only organizers can update side games', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = updateSideGameSchema.parse(body)

    const sideGame = await prisma.sideGame.update({
      where: { id: params.sideGameId },
      data: {
        winnerId: validated.winnerId,
        measurement: validated.measurement,
        unit: validated.unit,
      },
      include: {
        hole: { select: { number: true, par: true } },
        winner: {
          select: {
            id: true,
            user: { select: { name: true } },
            team: { select: { name: true, color: true } },
          },
        },
      },
    })

    return successResponse(sideGame)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/rounds/[roundId]/side-games/[sideGameId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; sideGameId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only organizers can delete side games', 'FORBIDDEN', 403)

    await prisma.sideGame.delete({ where: { id: params.sideGameId } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
