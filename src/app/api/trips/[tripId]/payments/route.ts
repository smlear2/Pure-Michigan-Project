import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { createPaymentItemSchema } from '@/lib/validators/payment'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/payments — list all payment items with records
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const items = await prisma.paymentItem.findMany({
      where: { tripId: params.tripId },
      include: {
        payments: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return successResponse(items)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/payments — create a payment item + UNPAID records for all players
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can manage payments', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = createPaymentItemSchema.parse(body)

    const activePlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      select: { id: true },
    })

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentItem.create({
        data: {
          tripId: params.tripId,
          name: validated.name,
          description: validated.description || null,
          amount: validated.amount,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          sortOrder: validated.sortOrder,
        },
      })

      // Auto-create UNPAID records for all active players
      for (const player of activePlayers) {
        await tx.paymentRecord.create({
          data: {
            paymentItemId: created.id,
            tripPlayerId: player.id,
            amountPaid: 0,
            status: 'UNPAID',
          },
        })
      }

      return tx.paymentItem.findUnique({
        where: { id: created.id },
        include: {
          payments: {
            include: {
              tripPlayer: {
                include: {
                  user: { select: { name: true } },
                  team: { select: { name: true, color: true } },
                },
              },
            },
          },
        },
      })
    })

    return successResponse(item, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
