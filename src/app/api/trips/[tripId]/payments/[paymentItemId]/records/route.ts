import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { bulkUpdatePaymentRecordsSchema } from '@/lib/validators/payment'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// PUT /api/trips/[tripId]/payments/[paymentItemId]/records — bulk update payment statuses
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; paymentItemId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can update payment records', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = bulkUpdatePaymentRecordsSchema.parse(body)

    const updated = await prisma.$transaction(async (tx) => {
      const results = []
      for (const record of validated.records) {
        const upserted = await tx.paymentRecord.upsert({
          where: {
            paymentItemId_tripPlayerId: {
              paymentItemId: params.paymentItemId,
              tripPlayerId: record.tripPlayerId,
            },
          },
          create: {
            paymentItemId: params.paymentItemId,
            tripPlayerId: record.tripPlayerId,
            amountPaid: record.amountPaid,
            status: record.status,
            paidAt: record.status === 'PAID' ? new Date() : null,
            notes: record.notes || null,
          },
          update: {
            amountPaid: record.amountPaid,
            status: record.status,
            paidAt: record.status === 'PAID' ? new Date() : null,
            notes: record.notes || null,
          },
        })
        results.push(upserted)
      }
      return results
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
