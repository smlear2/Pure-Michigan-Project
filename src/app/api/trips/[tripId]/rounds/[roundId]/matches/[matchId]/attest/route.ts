import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

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
    const side = body.side as number
    const attested = body.attested as boolean

    if (side !== 1 && side !== 2) {
      return errorResponse('Side must be 1 or 2', 'VALIDATION_ERROR', 400)
    }

    const updateData = side === 1
      ? { side1Attested: attested }
      : { side2Attested: attested }

    const match = await prisma.match.update({
      where: { id: params.matchId },
      data: updateData,
    })

    return successResponse(match)
  } catch (error) {
    return handleApiError(error)
  }
}
