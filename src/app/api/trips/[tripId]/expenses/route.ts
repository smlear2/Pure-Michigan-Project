import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { createExpenseSchema } from '@/lib/validators/expense'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { calculateExpenseSplits } from '@/lib/finance'

// GET /api/trips/[tripId]/expenses
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const expenses = await prisma.expense.findMany({
      where: { tripId: params.tripId },
      include: {
        paidBy: {
          include: {
            user: { select: { name: true } },
            team: { select: { name: true, color: true } },
          },
        },
        splits: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return successResponse(expenses)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/expenses
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Check permission
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      select: { expensePermission: true },
    })
    if (!trip) return errorResponse('Trip not found', 'NOT_FOUND', 404)

    if (trip.expensePermission === 'ORGANIZER_ONLY') {
      const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
      if (!isOrganizer) return errorResponse('Only the organizer can add expenses', 'FORBIDDEN', 403)
    } else {
      // Verify user is a trip member
      const member = await prisma.tripPlayer.findFirst({
        where: { tripId: params.tripId, userId: auth.dbUser.id },
      })
      if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)
    }

    const body = await request.json()
    const validated = createExpenseSchema.parse(body)

    // Get all active players for EVEN_ALL
    const activePlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      select: { id: true },
    })
    const allPlayerIds = activePlayers.map(p => p.id)

    // Calculate splits
    const splits = calculateExpenseSplits(
      validated.amount,
      validated.splitType,
      allPlayerIds,
      validated.paidById,
      validated.splitPlayerIds,
      validated.customSplits,
    )

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          tripId: params.tripId,
          description: validated.description,
          amount: validated.amount,
          date: validated.date ? new Date(validated.date) : new Date(),
          paidById: validated.paidById,
          splitType: validated.splitType,
          category: validated.category || null,
        },
      })

      for (const split of splits) {
        await tx.expenseSplit.create({
          data: {
            expenseId: created.id,
            tripPlayerId: split.tripPlayerId,
            amount: split.amount,
            isPayer: split.isPayer,
          },
        })
      }

      return tx.expense.findUnique({
        where: { id: created.id },
        include: {
          paidBy: { include: { user: { select: { name: true } } } },
          splits: { include: { tripPlayer: { include: { user: { select: { name: true } } } } } },
        },
      })
    })

    return successResponse(expense, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
