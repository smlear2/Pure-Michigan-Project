import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { z } from 'zod'

const createSideGameSchema = z.object({
  holeId: z.string().min(1),
  type: z.enum(['CLOSEST_PIN', 'LONGEST_DRIVE', 'LONGEST_PUTT']),
  winnerId: z.string().optional(),
  measurement: z.number().positive().optional(),
  unit: z.enum(['FEET', 'YARDS', 'INCHES']).default('FEET'),
})

// GET /api/trips/[tripId]/rounds/[roundId]/side-games
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const sideGames = await prisma.sideGame.findMany({
      where: {
        roundId: params.roundId,
        round: { tripId: params.tripId },
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
      orderBy: [{ hole: { number: 'asc' } }, { type: 'asc' }],
    })

    return successResponse(sideGames)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/rounds/[roundId]/side-games
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only organizers can record side games', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = createSideGameSchema.parse(body)

    const sideGame = await prisma.sideGame.create({
      data: {
        roundId: params.roundId,
        holeId: validated.holeId,
        type: validated.type,
        winnerId: validated.winnerId || null,
        measurement: validated.measurement ?? null,
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

    return successResponse(sideGame, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
