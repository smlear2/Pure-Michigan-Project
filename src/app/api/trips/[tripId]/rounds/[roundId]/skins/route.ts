import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import {
  calculateSkins,
  HoleSkinScore,
  isTeamFormat,
  skinsHandicap,
  teamSkinsHandicap,
  receivesStroke,
  receivesDoubleStroke,
  HandicapConfig,
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

    const teamFormat = isTeamFormat(round.format)
    const slope = round.tee.slope
    const rating = round.tee.rating
    const holes = round.tee.holes
    const par = holes.reduce((sum, h) => sum + h.par, 0)

    // Get team combo config from trip's handicapConfig
    const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null
    const teamCombos = hdcpConfig?.teamCombos ?? {}

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

    // Count unique players (everyone pays into the pot)
    const uniquePlayers = new Set<string>()
    // Compute individual skins handicaps
    const playerSkinsHdcps = new Map<string, number>()
    // Use ROUND for unified formula (future trips), CEIL for legacy (2025)
    const rounding = hdcpConfig?.useUnifiedFormula ? 'round' as const : 'ceil' as const

    for (const score of scores) {
      if (!score.matchPlayer.tripPlayer.skinsOptIn) continue
      const tpId = score.matchPlayer.tripPlayerId
      uniquePlayers.add(tpId)
      if (!playerSkinsHdcps.has(tpId)) {
        const index = score.matchPlayer.tripPlayer.handicapAtTime ?? 0
        playerSkinsHdcps.set(tpId, skinsHandicap(index, slope, rating, par, 20, rounding))
      }
    }

    // For team formats, build team membership and compute team skins handicaps
    const teamMembersMap = new Map<string, string[]>()
    const teamSkinsHdcpMap = new Map<string, number>()

    if (teamFormat) {
      const combo = teamCombos[round.format]
      if (combo) {
        // Group opted-in players by match+side to find teams
        for (const score of scores) {
          if (!score.matchPlayer.tripPlayer.skinsOptIn) continue
          const teamKey = `${score.matchPlayer.matchId}:${score.matchPlayer.side}`
          const tpId = score.matchPlayer.tripPlayerId

          if (!teamMembersMap.has(teamKey)) teamMembersMap.set(teamKey, [])
          const members = teamMembersMap.get(teamKey)!
          if (!members.includes(tpId)) members.push(tpId)
        }

        // Compute team skins handicaps from individual skins handicaps
        Array.from(teamMembersMap.entries()).forEach(([teamKey, members]) => {
          const hdcps = members.map(tpId => playerSkinsHdcps.get(tpId)!)
          teamSkinsHdcpMap.set(teamKey, teamSkinsHandicap(hdcps, combo.lowPct, combo.highPct))
        })
      } else {
        // Team format without combo config — just track opted-in members
        for (const score of scores) {
          if (!score.matchPlayer.tripPlayer.skinsOptIn) continue
          const teamKey = `${score.matchPlayer.matchId}:${score.matchPlayer.side}`
          const tpId = score.matchPlayer.tripPlayerId
          if (!teamMembersMap.has(teamKey)) teamMembersMap.set(teamKey, [])
          const members = teamMembersMap.get(teamKey)!
          if (!members.includes(tpId)) members.push(tpId)
        }
      }
    }

    // Build hole scores with recalculated skins net scores
    const holeScoresMap = new Map<string, Map<string, number>>()

    for (const score of scores) {
      if (!score.matchPlayer.tripPlayer.skinsOptIn) continue
      const hole = holes.find(h => h.id === score.holeId)
      if (!hole) continue

      const holeId = score.holeId
      if (!holeScoresMap.has(holeId)) holeScoresMap.set(holeId, new Map())
      const holeMap = holeScoresMap.get(holeId)!

      if (teamFormat) {
        const teamKey = `${score.matchPlayer.matchId}:${score.matchPlayer.side}`
        if (!holeMap.has(teamKey)) {
          // Use team skins handicap (if combo exists) or individual (if not)
          const hdcp = teamSkinsHdcpMap.get(teamKey)
            ?? playerSkinsHdcps.get(score.matchPlayer.tripPlayerId)!
          const hasStroke = receivesStroke(hdcp, hole.handicap)
          const hasDouble = receivesDoubleStroke(hdcp, hole.handicap)
          const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
          holeMap.set(teamKey, score.grossScore - strokesReceived)
        }
      } else {
        const tpId = score.matchPlayer.tripPlayerId
        if (!holeMap.has(tpId)) {
          const hdcp = playerSkinsHdcps.get(tpId)!
          const hasStroke = receivesStroke(hdcp, hole.handicap)
          const hasDouble = receivesDoubleStroke(hdcp, hole.handicap)
          const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
          holeMap.set(tpId, score.grossScore - strokesReceived)
        }
      }
    }

    // Convert to HoleSkinScore format ordered by hole number
    const holeScores: HoleSkinScore[] = holes.map(hole => {
      const holeMap = holeScoresMap.get(hole.id)
      if (!holeMap) {
        return { holeNumber: hole.number, playerScores: [] }
      }
      return {
        holeNumber: hole.number,
        playerScores: Array.from(holeMap.entries()).map(([playerId, netScore]) => ({
          playerId,
          netScore,
        })),
      }
    })

    // Check for wager config override
    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
    const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover

    // Pot is always based on all individual players (everyone pays in)
    const result = calculateSkins(holeScores, entryFee, uniquePlayers.size, carryover)

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
      // For team formats, expand team winners into individual players (each gets half)
      const expandedTotals: typeof result.playerTotals = []
      for (const pt of result.playerTotals) {
        const members = teamMembersMap.get(pt.playerId) ?? []
        for (const memberId of members) {
          const existing = expandedTotals.find(t => t.playerId === memberId)
          if (existing) {
            existing.skinsWon += pt.skinsWon
            existing.moneyWon += pt.moneyWon / members.length
          } else {
            expandedTotals.push({
              playerId: memberId,
              skinsWon: pt.skinsWon,
              moneyWon: pt.moneyWon / members.length,
            })
          }
        }
      }
      expandedTotals.sort((a, b) => b.moneyWon - a.moneyWon)

      const enrichedTotals = expandedTotals.map(pt => ({
        ...pt,
        playerName: tripPlayerMap.get(pt.playerId)?.name ?? 'Unknown',
        teamName: tripPlayerMap.get(pt.playerId)?.teamName ?? null,
        teamColor: tripPlayerMap.get(pt.playerId)?.teamColor ?? null,
      }))

      // Also enrich hole winners with team member names
      const enrichedHoles = result.holes.map(hole => {
        if (!hole.winnerId) return { ...hole, winnerName: null }
        const members = teamMembersMap.get(hole.winnerId) ?? []
        const names = members.map(id => tripPlayerMap.get(id)?.name ?? 'Unknown')
        return { ...hole, winnerName: names.join(' & ') }
      })

      return successResponse({
        ...result,
        holes: enrichedHoles,
        playerTotals: enrichedTotals,
        entryFee,
        carryover,
        playerCount: uniquePlayers.size,
        teamFormat: true,
      })
    }

    const enrichedTotals = result.playerTotals.map(pt => ({
      ...pt,
      playerName: tripPlayerMap.get(pt.playerId)?.name ?? 'Unknown',
      teamName: tripPlayerMap.get(pt.playerId)?.teamName ?? null,
      teamColor: tripPlayerMap.get(pt.playerId)?.teamColor ?? null,
    }))

    return successResponse({
      ...result,
      playerTotals: enrichedTotals,
      entryFee,
      carryover,
      playerCount: uniquePlayers.size,
      teamFormat: false,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
