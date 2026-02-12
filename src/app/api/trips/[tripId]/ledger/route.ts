import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { computeTiltForRound, computeSkinsForRound, calculateTiltPayouts, HandicapConfig, TiltCarryoverState } from '@/lib/golf'

// GET /api/trips/[tripId]/ledger — gambling P&L per player
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    // Load trip players with opt-in flags
    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      include: {
        user: { select: { name: true } },
        team: { select: { name: true, color: true } },
      },
    })

    // Load skins-enabled rounds
    const skinsRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, skinsEnabled: true },
      include: {
        trip: { select: { defaultSkinsEntryFee: true, defaultSkinsCarryover: true, handicapConfig: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
      orderBy: { roundNumber: 'asc' },
    })

    // Load all scores for skins rounds
    const allScores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { round: { tripId: params.tripId, skinsEnabled: true } },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: {
            tripPlayerId: true,
            matchId: true,
            side: true,
            match: { select: { roundId: true } },
            tripPlayer: { select: { handicapAtTime: true, skinsOptIn: true } },
          },
        },
      },
    })

    const scoresByRound = new Map<string, typeof allScores>()
    for (const s of allScores) {
      const rid = s.matchPlayer.match.roundId
      if (!scoresByRound.has(rid)) scoresByRound.set(rid, [])
      scoresByRound.get(rid)!.push(s)
    }

    const wagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'SKINS', isActive: true },
    })

    // Per-player per-round breakdown
    const playerRoundMap = new Map<string, { roundName: string; skinsWon: number; moneyWon: number; entryFee: number }[]>()
    for (const tp of tripPlayers) {
      playerRoundMap.set(tp.id, [])
    }

    for (const round of skinsRounds) {
      const roundScores = scoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null
      const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
      const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover

      const playerMap = new Map<string, { handicapIndex: number; skinsOptIn: boolean }>()
      for (const s of roundScores) {
        const tpId = s.matchPlayer.tripPlayerId
        if (!playerMap.has(tpId)) {
          playerMap.set(tpId, {
            handicapIndex: s.matchPlayer.tripPlayer.handicapAtTime ?? 0,
            skinsOptIn: s.matchPlayer.tripPlayer.skinsOptIn,
          })
        }
      }

      const { playerPayouts, uniquePlayerCount } = computeSkinsForRound(
        round.format,
        round.tee,
        roundScores.map(s => ({
          holeId: s.holeId,
          grossScore: s.grossScore,
          tripPlayerId: s.matchPlayer.tripPlayerId,
          matchId: s.matchPlayer.matchId,
          side: s.matchPlayer.side,
        })),
        Array.from(playerMap.entries()).map(([tpId, p]) => ({
          tripPlayerId: tpId,
          ...p,
        })),
        hdcpConfig,
        entryFee,
        carryover,
      )

      // Record per-player results for this round (opted-in players)
      const optedInPlayers = new Set(
        Array.from(playerMap.entries())
          .filter(([, p]) => p.skinsOptIn)
          .map(([tpId]) => tpId)
      )
      for (const tpId of Array.from(optedInPlayers)) {
        const pt = playerPayouts.find(p => p.playerId === tpId)
        const breakdown = playerRoundMap.get(tpId)
        if (breakdown) {
          breakdown.push({
            roundName: round.name || `Round ${round.roundNumber}`,
            skinsWon: pt?.skinsWon ?? 0,
            moneyWon: pt?.moneyWon ?? 0,
            entryFee,
          })
        }
      }
    }

    // --- TILT P&L (tournament-wide: one winner, entry fee paid once) ---
    const tiltRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, tiltEnabled: true },
      include: {
        trip: { select: { defaultTiltEntryFee: true, defaultTiltCarryover: true, handicapConfig: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
      orderBy: { roundNumber: 'asc' },
    })

    // Per-round TILT breakdown + tournament-wide totals
    const playerTiltMap = new Map<string, { roundName: string; totalPoints: number }[]>()
    for (const tp of tripPlayers) {
      playerTiltMap.set(tp.id, [])
    }
    const tiltGrandTotals = new Map<string, number>()
    const allTiltPlayers = new Set<string>()

    if (tiltRounds.length > 0) {
      const tiltScores = await prisma.score.findMany({
        where: {
          matchPlayer: {
            match: { round: { tripId: params.tripId, tiltEnabled: true } },
          },
        },
        include: {
          hole: true,
          matchPlayer: {
            select: {
              tripPlayerId: true,
              match: { select: { roundId: true } },
              tripPlayer: { select: { handicapAtTime: true, tiltOptIn: true } },
            },
          },
        },
      })

      const tiltScoresByRound = new Map<string, typeof tiltScores>()
      for (const s of tiltScores) {
        const rid = s.matchPlayer.match.roundId
        if (!tiltScoresByRound.has(rid)) tiltScoresByRound.set(rid, [])
        tiltScoresByRound.get(rid)!.push(s)
      }

      const useCarryover = tiltRounds[0].trip.defaultTiltCarryover
      let carryover: TiltCarryoverState | undefined

      for (const round of tiltRounds) {
        const roundScores = tiltScoresByRound.get(round.id) || []
        if (roundScores.length === 0) continue

        const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null

        const playerMap = new Map<string, { handicapIndex: number; tiltOptIn: boolean }>()
        for (const s of roundScores) {
          const tpId = s.matchPlayer.tripPlayerId
          if (!playerMap.has(tpId)) {
            playerMap.set(tpId, {
              handicapIndex: s.matchPlayer.tripPlayer.handicapAtTime ?? 0,
              tiltOptIn: s.matchPlayer.tripPlayer.tiltOptIn,
            })
          }
        }

        const { tiltResult, carryoverState } = computeTiltForRound(
          round.tee,
          roundScores.map(s => ({
            holeId: s.holeId,
            grossScore: s.grossScore,
            tripPlayerId: s.matchPlayer.tripPlayerId,
          })),
          Array.from(playerMap.entries()).map(([tpId, p]) => ({
            tripPlayerId: tpId,
            ...p,
          })),
          hdcpConfig,
          0,
          0,
          useCarryover ? carryover : undefined,
        )

        if (useCarryover) carryover = carryoverState

        for (const p of tiltResult.players) {
          allTiltPlayers.add(p.playerId)
          tiltGrandTotals.set(p.playerId, (tiltGrandTotals.get(p.playerId) ?? 0) + p.totalPoints)
          const breakdown = playerTiltMap.get(p.playerId)
          if (breakdown) {
            breakdown.push({
              roundName: round.name || `Round ${round.roundNumber}`,
              totalPoints: p.totalPoints,
            })
          }
        }
      }
    }

    // Tournament-wide TILT settlement
    const tiltWagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'TILT', isActive: true },
    })
    const tiltEntryFee = tiltRounds.length > 0
      ? (tiltWagerConfig?.entryFee ?? tiltRounds[0].trip.defaultTiltEntryFee)
      : 0
    const tiltPot = tiltEntryFee * allTiltPlayers.size

    const tiltPayouts = calculateTiltPayouts(tiltGrandTotals, tiltPot)

    // Build response
    const players = tripPlayers.map(tp => {
      const rounds = playerRoundMap.get(tp.id) || []
      const totalWon = rounds.reduce((s, r) => s + r.moneyWon, 0)
      const totalEntry = rounds.reduce((s, r) => s + r.entryFee, 0)
      const totalSkins = rounds.reduce((s, r) => s + r.skinsWon, 0)

      const tiltRoundsData = playerTiltMap.get(tp.id) || []
      const tiltTotal = tiltGrandTotals.get(tp.id) ?? 0
      const isInTilt = allTiltPlayers.has(tp.id)
      const tiltWinnings = tiltPayouts.get(tp.id) ?? 0
      const tiltNet = isInTilt ? tiltWinnings - tiltEntryFee : 0

      return {
        tripPlayerId: tp.id,
        name: tp.user.name,
        teamName: tp.team?.name ?? null,
        teamColor: tp.team?.color ?? null,
        totalSkinsWon: totalSkins,
        totalMoneyWon: Math.round(totalWon * 100) / 100,
        totalEntryFees: Math.round(totalEntry * 100) / 100,
        skinsNet: Math.round((totalWon - totalEntry) * 100) / 100,
        roundBreakdown: rounds,
        tiltNet: Math.round(tiltNet * 100) / 100,
        tiltTotalPoints: tiltTotal,
        tiltEntryFee: isInTilt ? tiltEntryFee : 0,
        tiltWinnings: Math.round(tiltWinnings * 100) / 100,
        tiltRounds: tiltRoundsData,
      }
    })

    players.sort((a, b) => (b.skinsNet + b.tiltNet) - (a.skinsNet + a.tiltNet))

    return successResponse({ players })
  } catch (error) {
    return handleApiError(error)
  }
}
