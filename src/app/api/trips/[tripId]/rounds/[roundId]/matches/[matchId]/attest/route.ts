import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

const attestSchema = z.object({
  side: z.union([z.literal(1), z.literal(2)]),
  attested: z.boolean(),
})

// POST /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]/attest
// Body: { side: 1 | 2, attested: boolean }
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Verify user is a trip member
    const tripPlayer = await prisma.tripPlayer.findFirst({
      where: { tripId: params.tripId, userId: auth.dbUser.id },
    })
    if (!tripPlayer) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = attestSchema.parse(body)

    const matchPlayer = await prisma.matchPlayer.findFirst({
      where: {
        matchId: params.matchId,
        tripPlayerId: tripPlayer.id,
        side: validated.side,
      },
    })
    if (!matchPlayer) return errorResponse('You can only attest your own side', 'FORBIDDEN', 403)

    const updateData = validated.side === 1
      ? { side1Attested: validated.attested }
      : { side2Attested: validated.attested }

    const match = await prisma.match.update({
      where: { id: params.matchId },
      data: updateData,
    })

    return successResponse(match)
  } catch (error) {
    return handleApiError(error)
  }
}
