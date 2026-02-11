import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { addPlayerSchema } from '@/lib/validators/player'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/trips/[tripId]/players
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId },
      include: {
        user: {
          select: { id: true, name: true, email: true, handicapIndex: true, ghinNumber: true, supabaseId: true },
        },
        team: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Add isPending flag so UI can show invite status without exposing supabaseId
    const withStatus = tripPlayers.map((tp) => ({
      ...tp,
      isPending: tp.user.supabaseId.startsWith('pending-'),
      user: { id: tp.user.id, name: tp.user.name, email: tp.user.email, handicapIndex: tp.user.handicapIndex, ghinNumber: tp.user.ghinNumber },
    }))

    return successResponse(withStatus)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/players — add a player
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can add players', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = addPlayerSchema.parse(body)

    const tripPlayer = await prisma.$transaction(async (tx) => {
      // Check if a User with this email already exists
      let user = await tx.user.findUnique({
        where: { email: validated.email },
      })

      if (!user) {
        // Create a placeholder user (pending signup)
        user = await tx.user.create({
          data: {
            supabaseId: `pending-${crypto.randomUUID()}`,
            email: validated.email,
            name: validated.name,
            handicapIndex: validated.handicapIndex ?? null,
            ghinNumber: validated.ghinNumber || null,
          },
        })
      }

      // Check if this user is already in this trip
      const existing = await tx.tripPlayer.findUnique({
        where: { userId_tripId: { userId: user.id, tripId: params.tripId } },
      })
      if (existing) {
        throw new Error('This player is already in the trip')
      }

      // Create the TripPlayer
      return tx.tripPlayer.create({
        data: {
          userId: user.id,
          tripId: params.tripId,
          teamId: validated.teamId || null,
          handicapAtTime: validated.handicapIndex ?? user.handicapIndex ?? 0,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, handicapIndex: true, ghinNumber: true },
          },
          team: { select: { id: true, name: true, color: true } },
        },
      })
    })

    // Send invitation email if the user is a placeholder (hasn't signed up yet)
    const user = await prisma.user.findUnique({ where: { id: tripPlayer.userId } })
    let invited = false
    if (user && user.supabaseId.startsWith('pending-')) {
      try {
        const adminClient = createAdminClient()
        const origin = getOrigin(request)
        await adminClient.auth.admin.inviteUserByEmail(user.email, {
          redirectTo: `${origin}/auth/callback`,
          data: { name: user.name },
        })
        invited = true
      } catch (inviteError) {
        console.error('Failed to send invitation email:', inviteError)
      }
    }

    return successResponse({ ...tripPlayer, isPending: user?.supabaseId.startsWith('pending-') ?? false, invited }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'This player is already in the trip') {
      return errorResponse(error.message, 'DUPLICATE_PLAYER', 409)
    }
    return handleApiError(error)
  }
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  return new URL(request.url).origin
}
