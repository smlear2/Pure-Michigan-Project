import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { bestBall, holeWinner, computeMatchState, HoleResult } from '@/lib/golf'

// POST /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]/finalize
// Compute final result, set status=COMPLETE, write resultText + points
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Check: organizer OR canVerifyScores
    const tripPlayer = await prisma.tripPlayer.findFirst({
      where: { tripId: params.tripId, userId: auth.dbUser.id },
    })
    if (!tripPlayer) return errorResponse('You are not a member of this trip', 'FORBIDDEN', 403)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer && !tripPlayer.canVerifyScores) {
      return errorResponse('Only organizer or score verifiers can finalize matches', 'FORBIDDEN', 403)
    }

    // Load the match with all data needed
    const match = await prisma.match.findFirst({
      where: {
        id: params.matchId,
        roundId: params.roundId,
        round: { tripId: params.tripId },
      },
      include: {
        round: {
          include: {
            tee: {
              include: { holes: { orderBy: { number: 'asc' } } },
            },
            trip: {
              select: { pointsForWin: true, pointsForHalf: true },
            },
          },
        },
        players: {
          include: {
            scores: {
              include: { hole: true },
              orderBy: { hole: { number: 'asc' } },
            },
          },
        },
      },
    })

    if (!match) return errorResponse('Match not found', 'NOT_FOUND', 404)

    if (match.status === 'COMPLETE') {
      return errorResponse('Match is already finalized', 'BAD_REQUEST', 400)
    }

    // Determine format and compute hole results
    const format = match.round.format
    const holes = match.round.tee.holes
    const totalHoles = holes.length

    const side1Players = match.players.filter(p => p.side === 1)
    const side2Players = match.players.filter(p => p.side === 2)

    // Build hole-by-hole results based on format
    const holeResults: HoleResult[] = holes.map(hole => {
      const side1Scores = side1Players.map(p => {
        const score = p.scores.find(s => s.holeId === hole.id)
        return score ? score.netScore : null
      })
      const side2Scores = side2Players.map(p => {
        const score = p.scores.find(s => s.holeId === hole.id)
        return score ? score.netScore : null
      })

      let side1Net: number | null = null
      let side2Net: number | null = null

      if (format === 'FOURBALL' || format === 'SHAMBLE') {
        // Best ball of each side
        side1Net = bestBall(side1Scores)
        side2Net = bestBall(side2Scores)
      } else if (format === 'SINGLES') {
        // Direct comparison (1 player per side)
        side1Net = side1Scores[0] ?? null
        side2Net = side2Scores[0] ?? null
      } else if (format === 'FOURSOMES' || format === 'MODIFIED_ALT_SHOT' || format === 'SCRAMBLE') {
        // One score per side per hole
        side1Net = side1Scores.find(s => s !== null) ?? null
        side2Net = side2Scores.find(s => s !== null) ?? null
      } else if (format === 'STROKEPLAY') {
        // Strokeplay: sum totals at end, not hole-by-hole match play
        // For finalization, we still track hole results for display
        side1Net = bestBall(side1Scores)
        side2Net = bestBall(side2Scores)
      }

      return holeWinner(side1Net, side2Net)
    })

    // For STROKEPLAY, compute total strokes instead of match play
    let resultText: string
    let side1Points: number
    let side2Points: number

    if (format === 'STROKEPLAY') {
      // Sum total net strokes per side
      const side1Total = side1Players.reduce((sum, p) => {
        return sum + p.scores.reduce((s, score) => s + score.netScore, 0)
      }, 0)
      const side2Total = side2Players.reduce((sum, p) => {
        return sum + p.scores.reduce((s, score) => s + score.netScore, 0)
      }, 0)

      if (side1Total < side2Total) {
        resultText = `Won by ${side2Total - side1Total}`
        side1Points = match.round.trip.pointsForWin
        side2Points = 0
      } else if (side2Total < side1Total) {
        resultText = `Won by ${side1Total - side2Total}`
        side1Points = 0
        side2Points = match.round.trip.pointsForWin
      } else {
        resultText = 'Tied'
        side1Points = match.round.trip.pointsForHalf
        side2Points = match.round.trip.pointsForHalf
      }
    } else {
      // Match play computation
      const state = computeMatchState(
        holeResults,
        totalHoles,
        match.round.trip.pointsForWin,
        match.round.trip.pointsForHalf,
      )

      resultText = state.resultText || 'Incomplete'
      side1Points = state.side1Points
      side2Points = state.side2Points
    }

    // Update the match
    const updated = await prisma.match.update({
      where: { id: params.matchId },
      data: {
        status: 'COMPLETE',
        resultText,
        side1Points,
        side2Points,
      },
      include: {
        players: {
          include: {
            tripPlayer: {
              include: {
                user: { select: { id: true, name: true } },
                team: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
    })

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
