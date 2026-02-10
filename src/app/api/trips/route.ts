import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createTripSchema } from '@/lib/validators/trip'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips — list the current user's trips
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { userId: auth.dbUser.id },
      include: {
        trip: {
          include: {
            teams: { orderBy: { sortOrder: 'asc' } },
            rounds: { orderBy: { roundNumber: 'asc' } },
            tripPlayers: true,
            courses: true,
          },
        },
      },
      orderBy: { trip: { startDate: 'desc' } },
    })

    const trips = tripPlayers.map((tp) => ({
      ...tp.trip,
      role: tp.role,
    }))

    return successResponse(trips)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips — create a new trip (user becomes ORGANIZER)
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const body = await request.json()
    const validated = createTripSchema.parse(body)

    const trip = await prisma.$transaction(async (tx) => {
      // Create the trip
      const newTrip = await tx.trip.create({
        data: {
          name: validated.name,
          year: validated.year,
          startDate: new Date(validated.startDate),
          endDate: new Date(validated.endDate),
          location: validated.location || null,
          description: validated.description || null,
          isTeamEvent: validated.isTeamEvent,
          pointsForWin: validated.pointsForWin,
          pointsForHalf: validated.pointsForHalf,
          pointsToWin: validated.pointsToWin ?? null,
        },
      })

      // Create the organizer as the first TripPlayer
      await tx.tripPlayer.create({
        data: {
          userId: auth.dbUser.id,
          tripId: newTrip.id,
          role: 'ORGANIZER',
          handicapAtTime: auth.dbUser.handicapIndex ?? 0,
        },
      })

      return newTrip
    })

    return successResponse(trip, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
