import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/standings
// Aggregate team points across all rounds/matches
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    // Load trip with teams and defending champion
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      select: {
        id: true,
        name: true,
        pointsForWin: true,
        pointsForHalf: true,
        pointsToWin: true,
        isTeamEvent: true,
        defendingChampionTeamId: true,
        teams: {
          select: { id: true, name: true, color: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!trip) return errorResponse('Trip not found', 'NOT_FOUND', 404)

    // Load all completed matches with player teams
    const matches = await prisma.match.findMany({
      where: {
        round: { tripId: params.tripId },
        status: 'COMPLETE',
      },
      include: {
        round: { select: { id: true, roundNumber: true, name: true, format: true } },
        players: {
          include: {
            tripPlayer: {
              select: { teamId: true },
            },
          },
        },
      },
      orderBy: { round: { roundNumber: 'asc' } },
    })

    // Build team standings
    const teamPoints: Map<string, { total: number; byRound: Map<string, number>; matchesWon: number; matchesLost: number; matchesHalved: number }> = new Map()

    for (const team of trip.teams) {
      teamPoints.set(team.id, {
        total: 0,
        byRound: new Map(),
        matchesWon: 0,
        matchesLost: 0,
        matchesHalved: 0,
      })
    }

    for (const match of matches) {
      // Determine which team is on each side
      const side1TeamIds = Array.from(new Set(match.players.filter(p => p.side === 1).map(p => p.tripPlayer.teamId).filter(Boolean)))
      const side2TeamIds = Array.from(new Set(match.players.filter(p => p.side === 2).map(p => p.tripPlayer.teamId).filter(Boolean)))

      // Award points to teams
      for (const teamId of side1TeamIds) {
        if (!teamId) continue
        const team = teamPoints.get(teamId)
        if (!team) continue
        team.total += match.side1Points
        const roundPts = team.byRound.get(match.roundId) ?? 0
        team.byRound.set(match.roundId, roundPts + match.side1Points)

        if (match.side1Points > match.side2Points) team.matchesWon++
        else if (match.side1Points < match.side2Points) team.matchesLost++
        else team.matchesHalved++
      }

      for (const teamId of side2TeamIds) {
        if (!teamId) continue
        const team = teamPoints.get(teamId)
        if (!team) continue
        team.total += match.side2Points
        const roundPts = team.byRound.get(match.roundId) ?? 0
        team.byRound.set(match.roundId, roundPts + match.side2Points)

        if (match.side2Points > match.side1Points) team.matchesWon++
        else if (match.side2Points < match.side1Points) team.matchesLost++
        else team.matchesHalved++
      }
    }

    // Build rounds list for breakdown
    const rounds = await prisma.round.findMany({
      where: { tripId: params.tripId },
      select: { id: true, roundNumber: true, name: true, format: true },
      orderBy: { roundNumber: 'asc' },
    })

    // Build response
    const standings = trip.teams.map(team => {
      const pts = teamPoints.get(team.id)!
      return {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalPoints: pts.total,
        matchesWon: pts.matchesWon,
        matchesLost: pts.matchesLost,
        matchesHalved: pts.matchesHalved,
        isDefendingChampion: team.id === trip.defendingChampionTeamId,
        roundBreakdown: rounds.map(r => ({
          roundId: r.id,
          roundNumber: r.roundNumber,
          roundName: r.name,
          format: r.format,
          points: pts.byRound.get(r.id) ?? 0,
        })),
      }
    })

    // Sort by total points descending
    standings.sort((a, b) => b.totalPoints - a.totalPoints)

    return successResponse({
      standings,
      pointsToWin: trip.pointsToWin,
      defendingChampionTeamId: trip.defendingChampionTeamId,
      totalMatchesPlayed: matches.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
