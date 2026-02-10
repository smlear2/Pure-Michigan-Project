import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { updateRoundSchema } from '@/lib/validators/round'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// PUT /api/trips/[tripId]/rounds/[roundId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const existing = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
    })
    if (!existing) return errorResponse('Round not found', 'NOT_FOUND', 404)

    const body = await request.json()
    const validated = updateRoundSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.teeId !== undefined) updateData.teeId = validated.teeId
    if (validated.roundNumber !== undefined) updateData.roundNumber = validated.roundNumber
    if (validated.name !== undefined) updateData.name = validated.name || null
    if (validated.date !== undefined) updateData.date = validated.date ? new Date(validated.date) : null
    if (validated.format !== undefined) updateData.format = validated.format
    if (validated.skinsEnabled !== undefined) updateData.skinsEnabled = validated.skinsEnabled

    // Verification status — requires organizer or canVerifyScores
    if (validated.verificationStatus !== undefined) {
      if (!isOrganizer) {
        const tripPlayer = await prisma.tripPlayer.findFirst({
          where: { tripId: params.tripId, userId: auth.dbUser.id, canVerifyScores: true },
        })
        if (!tripPlayer) {
          return errorResponse('Only organizer or score verifiers can change verification status', 'FORBIDDEN', 403)
        }
      }
      updateData.verificationStatus = validated.verificationStatus
      if (validated.verificationStatus === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        updateData.verifiedById = auth.dbUser.id
      }
    }

    const round = await prisma.round.update({
      where: { id: params.roundId },
      data: updateData,
      include: {
        tee: {
          include: {
            course: { select: { id: true, name: true, location: true } },
          },
        },
      },
    })

    return successResponse(round)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/rounds/[roundId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const existing = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
    })
    if (!existing) return errorResponse('Round not found', 'NOT_FOUND', 404)

    await prisma.round.delete({
      where: { id: params.roundId },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
