import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer, requireTripMember } from '@/lib/auth'
import { createRoundSchema } from '@/lib/validators/round'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/rounds
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const rounds = await prisma.round.findMany({
      where: { tripId: params.tripId },
      include: {
        tee: {
          include: {
            course: { select: { id: true, name: true, location: true } },
            holes: { orderBy: { number: 'asc' } },
          },
        },
      },
      orderBy: { roundNumber: 'asc' },
    })

    return successResponse(rounds)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/rounds
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can add rounds', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = createRoundSchema.parse(body)

    const round = await prisma.round.create({
      data: {
        tripId: params.tripId,
        teeId: validated.teeId,
        roundNumber: validated.roundNumber,
        name: validated.name || null,
        date: validated.date ? new Date(validated.date) : null,
        format: validated.format,
        skinsEnabled: validated.skinsEnabled,
      },
      include: {
        tee: {
          include: {
            course: { select: { id: true, name: true, location: true } },
          },
        },
      },
    })

    return successResponse(round, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
