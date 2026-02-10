import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { updatePaymentItemSchema } from '@/lib/validators/payment'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// PUT /api/trips/[tripId]/payments/[paymentItemId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; paymentItemId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can manage payments', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = updatePaymentItemSchema.parse(body)

    const item = await prisma.paymentItem.update({
      where: { id: params.paymentItemId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description || null }),
        ...(validated.amount !== undefined && { amount: validated.amount }),
        ...(validated.dueDate !== undefined && { dueDate: validated.dueDate ? new Date(validated.dueDate) : null }),
        ...(validated.sortOrder !== undefined && { sortOrder: validated.sortOrder }),
      },
      include: { payments: true },
    })

    return successResponse(item)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/payments/[paymentItemId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string; paymentItemId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can manage payments', 'FORBIDDEN', 403)

    await prisma.paymentItem.delete({ where: { id: params.paymentItemId } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
