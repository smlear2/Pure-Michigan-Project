import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import {
  isTeamFormat,
  HandicapConfig,
  computeSkinsForRound,
} from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/skins
// Compute skins from all scores in the round using skins-specific handicaps
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    // Load round with tee data (slope, rating, holes) and trip config
    const round = await prisma.round.findFirst({
      where: { id: params.roundId, tripId: params.tripId },
      include: {
        trip: {
          select: {
            defaultSkinsEntryFee: true,
            defaultSkinsCarryover: true,
            handicapConfig: true,
          },
        },
        tee: {
          include: { holes: { orderBy: { number: 'asc' } } },
        },
      },
    })

    if (!round) return errorResponse('Round not found', 'NOT_FOUND', 404)

    if (!round.skinsEnabled) {
      return successResponse({ message: 'Skins not enabled for this round', results: null })
    }

    const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null
    const teamFormat = isTeamFormat(round.format)

    // Get all scores in this round across all matches
    const scores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { roundId: params.roundId },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: {
            side: true,
            matchId: true,
            tripPlayerId: true,
            tripPlayer: {
              select: {
                handicapAtTime: true,
                skinsOptIn: true,
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    })

    // Build player inputs for the shared helper
    const playerMap = new Map<string, { handicapIndex: number; skinsOptIn: boolean }>()
    for (const score of scores) {
      const tpId = score.matchPlayer.tripPlayerId
      if (!playerMap.has(tpId)) {
        playerMap.set(tpId, {
          handicapIndex: score.matchPlayer.tripPlayer.handicapAtTime ?? 0,
          skinsOptIn: score.matchPlayer.tripPlayer.skinsOptIn,
        })
      }
    }

    const playerInputs = Array.from(playerMap.entries()).map(([tpId, p]) => ({
      tripPlayerId: tpId,
      handicapIndex: p.handicapIndex,
      skinsOptIn: p.skinsOptIn,
    }))

    const scoreInputs = scores.map(s => ({
      holeId: s.holeId,
      grossScore: s.grossScore,
      tripPlayerId: s.matchPlayer.tripPlayerId,
      matchId: s.matchPlayer.matchId,
      side: s.matchPlayer.side,
    }))

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
    const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover

    // Compute skins using shared helper (WHS handicaps, team handling, Scramble gross)
    const { skinsResult, playerPayouts, uniquePlayerCount, teamMembersMap } = computeSkinsForRound(
      round.format,
      round.tee,
      scoreInputs,
      playerInputs,
      hdcpConfig,
      entryFee,
      carryover,
    )

    // Enrich player totals with names
    const tripPlayerMap = new Map<string, { name: string; teamName: string | null; teamColor: string | null }>()
    for (const score of scores) {
      const tp = score.matchPlayer
      if (!tripPlayerMap.has(tp.tripPlayerId)) {
        tripPlayerMap.set(tp.tripPlayerId, {
          name: tp.tripPlayer.user.name,
          teamName: tp.tripPlayer.team?.name ?? null,
          teamColor: tp.tripPlayer.team?.color ?? null,
        })
      }
    }

    if (teamFormat) {
      const enrichedTotals = playerPayouts
        .sort((a, b) => b.moneyWon - a.moneyWon)
        .map(pt => ({
          ...pt,
          playerName: tripPlayerMap.get(pt.playerId)?.name ?? 'Unknown',
          teamName: tripPlayerMap.get(pt.playerId)?.teamName ?? null,
          teamColor: tripPlayerMap.get(pt.playerId)?.teamColor ?? null,
        }))

      // Enrich hole winners with team member names
      const enrichedHoles = skinsResult.holes.map(hole => {
        if (!hole.winnerId) return { ...hole, winnerName: null }
        const members = teamMembersMap.get(hole.winnerId) ?? []
        const names = members.map(id => tripPlayerMap.get(id)?.name ?? 'Unknown')
        return { ...hole, winnerName: names.join(' & ') }
      })

      return successResponse({
        ...skinsResult,
        holes: enrichedHoles,
        playerTotals: enrichedTotals,
        entryFee,
        carryover,
        playerCount: uniquePlayerCount,
        teamFormat: true,
      })
    }

    const enrichedTotals = playerPayouts.map(pt => ({
      ...pt,
      playerName: tripPlayerMap.get(pt.playerId)?.name ?? 'Unknown',
      teamName: tripPlayerMap.get(pt.playerId)?.teamName ?? null,
      teamColor: tripPlayerMap.get(pt.playerId)?.teamColor ?? null,
    }))

    return successResponse({
      ...skinsResult,
      playerTotals: enrichedTotals,
      entryFee,
      carryover,
      playerCount: uniquePlayerCount,
      teamFormat: false,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
