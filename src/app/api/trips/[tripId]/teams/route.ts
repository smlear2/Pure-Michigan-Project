import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer, requireTripMember } from '@/lib/auth'
import { upsertTeamsSchema } from '@/lib/validators/team'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/teams
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const teams = await prisma.team.findMany({
      where: { tripId: params.tripId },
      orderBy: { sortOrder: 'asc' },
    })

    return successResponse(teams)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/trips/[tripId]/teams — batch upsert all teams
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Only the organizer can edit teams', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = upsertTeamsSchema.parse(body)

    const teams = await prisma.$transaction(async (tx) => {
      // Get existing teams
      const existing = await tx.team.findMany({
        where: { tripId: params.tripId },
        include: { tripPlayers: { select: { id: true } } },
      })

      const submittedIds = new Set(
        validated.teams.filter((t) => t.id).map((t) => t.id!)
      )

      // Delete teams that are no longer in the list (only if they have no players)
      for (const team of existing) {
        if (!submittedIds.has(team.id)) {
          if (team.tripPlayers.length > 0) {
            throw new Error(`Cannot delete team "${team.name}" — it has players assigned`)
          }
          await tx.team.delete({ where: { id: team.id } })
        }
      }

      // Upsert teams
      const result = []
      for (const team of validated.teams) {
        if (team.id && existing.some((e) => e.id === team.id)) {
          // Update existing
          const updated = await tx.team.update({
            where: { id: team.id },
            data: {
              name: team.name,
              color: team.color,
              sortOrder: team.sortOrder,
            },
          })
          result.push(updated)
        } else {
          // Create new
          const created = await tx.team.create({
            data: {
              tripId: params.tripId,
              name: team.name,
              color: team.color,
              sortOrder: team.sortOrder,
            },
          })
          result.push(created)
        }
      }

      // Update defending champion on Trip
      await tx.trip.update({
        where: { id: params.tripId },
        data: {
          defendingChampionTeamId: validated.defendingChampionTeamId ?? null,
        },
      })

      return result
    })

    return successResponse(teams)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot delete team')) {
      return errorResponse(error.message, 'TEAM_HAS_PLAYERS', 409)
    }
    return handleApiError(error)
  }
}
