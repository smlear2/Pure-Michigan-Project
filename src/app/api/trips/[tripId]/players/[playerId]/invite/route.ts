import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// POST /api/trips/[tripId]/players/[playerId]/invite — resend invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; playerId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const tripPlayer = await prisma.tripPlayer.findFirst({
      where: { id: params.playerId, tripId: params.tripId },
      include: { user: true },
    })
    if (!tripPlayer) return errorResponse('Player not found', 'NOT_FOUND', 404)

    if (!tripPlayer.user.supabaseId.startsWith('pending-')) {
      return errorResponse('This player has already signed up', 'ALREADY_SIGNED_UP', 400)
    }

    const adminClient = createAdminClient()
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
    const origin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(request.url).origin

    await adminClient.auth.admin.inviteUserByEmail(tripPlayer.user.email, {
      redirectTo: `${origin}/auth/callback`,
      data: { name: tripPlayer.user.name },
    })

    return successResponse({ sent: true })
  } catch (error) {
    return handleApiError(error)
  }
}
