import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// DELETE /api/trips/[tripId]/expenses/[expenseId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; expenseId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const expense = await prisma.expense.findFirst({
      where: { id: params.expenseId, tripId: params.tripId },
      select: { paidById: true },
    })
    if (!expense) return errorResponse('Expense not found', 'NOT_FOUND', 404)

    // Allow organizer or the original payer
    const tripPlayer = await prisma.tripPlayer.findFirst({
      where: { tripId: params.tripId, userId: auth.dbUser.id },
    })
    if (!tripPlayer) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    if (tripPlayer.id !== expense.paidById) {
      const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
      if (!isOrganizer) return errorResponse('Only the organizer or payer can delete this expense', 'FORBIDDEN', 403)
    }

    await prisma.expense.delete({ where: { id: params.expenseId } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
