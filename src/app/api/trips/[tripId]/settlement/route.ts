import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { simplifyDebts } from '@/lib/finance'
import { calculateTilt, TiltHoleScore, computeSkinsForRound, HandicapConfig } from '@/lib/golf'

// GET /api/trips/[tripId]/settlement — net balances + simplified debts
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const tripPlayers = await prisma.tripPlayer.findMany({
      where: { tripId: params.tripId, isActive: true },
      include: {
        user: { select: { name: true } },
        team: { select: { name: true, color: true } },
      },
    })

    // Build opt-in sets for filtering
    const skinsOptedIn = new Set(tripPlayers.filter(tp => tp.skinsOptIn).map(tp => tp.id))
    const tiltOptedIn = new Set(tripPlayers.filter(tp => tp.tiltOptIn).map(tp => tp.id))

    // --- 1. Payment Schedule Balance ---
    const paymentItems = await prisma.paymentItem.findMany({
      where: { tripId: params.tripId },
      include: { payments: true },
    })

    const paymentBalances = new Map<string, number>()
    for (const tp of tripPlayers) {
      let totalOwed = 0
      let totalPaid = 0
      for (const item of paymentItems) {
        totalOwed += item.amount
        const record = item.payments.find(p => p.tripPlayerId === tp.id)
        if (record) totalPaid += record.amountPaid
      }
      paymentBalances.set(tp.id, -(totalOwed - totalPaid)) // negative = still owes
    }

    // --- 2. Expense Balance ---
    const expenses = await prisma.expense.findMany({
      where: { tripId: params.tripId },
      include: { splits: true },
    })

    const expenseBalances = new Map<string, number>()
    for (const tp of tripPlayers) {
      expenseBalances.set(tp.id, 0)
    }

    for (const expense of expenses) {
      const payerId = expense.paidById
      for (const split of expense.splits) {
        if (split.isPayer) continue // payer doesn't owe themselves
        // split.tripPlayer owes payer split.amount
        const payerBal = expenseBalances.get(payerId) ?? 0
        expenseBalances.set(payerId, payerBal + split.amount) // payer is owed

        const owerBal = expenseBalances.get(split.tripPlayerId) ?? 0
        expenseBalances.set(split.tripPlayerId, owerBal - split.amount) // ower owes
      }
    }

    // --- 3. Gambling Balance (skins P&L) ---
    const gamblingBalances = new Map<string, number>()
    for (const tp of tripPlayers) {
      gamblingBalances.set(tp.id, 0)
    }

    const skinsRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, skinsEnabled: true },
      include: {
        trip: { select: { defaultSkinsEntryFee: true, defaultSkinsCarryover: true, handicapConfig: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
    })

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

    for (const round of skinsRounds) {
      const roundScores = scoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      const hdcpConfig = round.trip.handicapConfig as HandicapConfig | null
      const entryFee = wagerConfig?.entryFee ?? round.trip.defaultSkinsEntryFee
      const carryover = wagerConfig?.carryover ?? round.trip.defaultSkinsCarryover

      // Build player inputs from scores
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

      // Opted-in players who didn't win still pay entry fee
      const optedInPlayers = new Set(
        Array.from(playerMap.entries())
          .filter(([, p]) => p.skinsOptIn)
          .map(([tpId]) => tpId)
      )
      for (const tpId of Array.from(optedInPlayers)) {
        const payout = playerPayouts.find(p => p.playerId === tpId)
        const moneyWon = payout?.moneyWon ?? 0
        const bal = gamblingBalances.get(tpId) ?? 0
        gamblingBalances.set(tpId, bal + moneyWon - entryFee)
      }
    }

    // --- 3b. TILT Gambling Balance ---
    const tiltRounds = await prisma.round.findMany({
      where: { tripId: params.tripId, tiltEnabled: true },
      include: {
        trip: { select: { defaultTiltEntryFee: true } },
        tee: { include: { holes: { orderBy: { number: 'asc' } } } },
      },
    })

    const tiltScores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          match: { round: { tripId: params.tripId, tiltEnabled: true } },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: { tripPlayerId: true, match: { select: { roundId: true } } },
        },
      },
    })

    const tiltScoresByRound = new Map<string, typeof tiltScores>()
    for (const s of tiltScores) {
      const rid = s.matchPlayer.match.roundId
      if (!tiltScoresByRound.has(rid)) tiltScoresByRound.set(rid, [])
      tiltScoresByRound.get(rid)!.push(s)
    }

    const tiltWagerConfig = await prisma.wagerConfig.findFirst({
      where: { tripId: params.tripId, type: 'TILT', isActive: true },
    })

    for (const round of tiltRounds) {
      const roundScores = tiltScoresByRound.get(round.id) || []
      if (roundScores.length === 0) continue

      const holeScoresMap = new Map<string, Map<string, { netScore: number; par: number }>>()
      const uniqueTiltPlayers = new Set<string>()

      for (const score of roundScores) {
        const tpId = score.matchPlayer.tripPlayerId
        if (!tiltOptedIn.has(tpId)) continue
        if (!holeScoresMap.has(score.holeId)) holeScoresMap.set(score.holeId, new Map())
        const holeMap = holeScoresMap.get(score.holeId)!
        uniqueTiltPlayers.add(tpId)
        if (!holeMap.has(tpId)) {
          holeMap.set(tpId, { netScore: score.netScore, par: score.hole.par })
        }
      }

      const tiltHoleScores: TiltHoleScore[] = round.tee.holes.map(hole => {
        const holeMap = holeScoresMap.get(hole.id)
        if (!holeMap) return { holeNumber: hole.number, playerScores: [] }
        return {
          holeNumber: hole.number,
          playerScores: Array.from(holeMap.entries()).map(([playerId, data]) => ({
            playerId,
            netScore: data.netScore,
            par: data.par,
          })),
        }
      })

      const tiltEntryFee = tiltWagerConfig?.entryFee ?? round.trip.defaultTiltEntryFee
      const tiltResult = calculateTilt(tiltHoleScores, tiltEntryFee, uniqueTiltPlayers.size)
      const pot = tiltEntryFee * uniqueTiltPlayers.size

      // Handle ties: split pot among all players sharing the top score
      const topScore = tiltResult.players.length > 0 ? tiltResult.players[0].totalPoints : 0
      const winners = tiltResult.players.filter(p => p.totalPoints === topScore)
      const winnerIds = new Set(winners.map(w => w.playerId))
      const winningsPerWinner = pot / winners.length

      for (const tpId of Array.from(uniqueTiltPlayers)) {
        const bal = gamblingBalances.get(tpId) ?? 0
        const winnings = winnerIds.has(tpId) ? winningsPerWinner : 0
        gamblingBalances.set(tpId, bal + winnings - tiltEntryFee)
      }
    }

    // --- 4. Combine ---
    const players = tripPlayers.map(tp => {
      const paymentBal = Math.round((paymentBalances.get(tp.id) ?? 0) * 100) / 100
      const expenseBal = Math.round((expenseBalances.get(tp.id) ?? 0) * 100) / 100
      const gamblingBal = Math.round((gamblingBalances.get(tp.id) ?? 0) * 100) / 100
      const netBalance = Math.round((paymentBal + expenseBal + gamblingBal) * 100) / 100

      return {
        tripPlayerId: tp.id,
        name: tp.user.name,
        teamName: tp.team?.name ?? null,
        teamColor: tp.team?.color ?? null,
        paymentBalance: paymentBal,
        expenseBalance: expenseBal,
        gamblingBalance: gamblingBal,
        netBalance,
      }
    })

    // --- 5. Simplify ---
    const simplifiedDebts = simplifyDebts(
      players.map(p => ({
        tripPlayerId: p.tripPlayerId,
        name: p.name,
        netBalance: p.netBalance,
      }))
    )

    return successResponse({ players, simplifiedDebts })
  } catch (error) {
    return handleApiError(error)
  }
}
