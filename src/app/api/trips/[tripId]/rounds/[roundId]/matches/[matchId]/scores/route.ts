import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireTripMember } from '@/lib/auth'
import { upsertScoresSchema } from '@/lib/validators/score'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'
import { applyMaxScore, netScore, receivesStroke, receivesDoubleStroke } from '@/lib/golf'

// GET /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]/scores
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const member = await requireTripMember(params.tripId, auth.dbUser.id)
    if (!member) return errorResponse('Not a trip member', 'FORBIDDEN', 403)

    const scores = await prisma.score.findMany({
      where: {
        matchPlayer: {
          matchId: params.matchId,
          match: { roundId: params.roundId, round: { tripId: params.tripId } },
        },
      },
      include: {
        hole: true,
        matchPlayer: {
          select: {
            id: true,
            side: true,
            playingHandicap: true,
            tripPlayer: {
              select: {
                user: { select: { name: true } },
                team: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
      orderBy: [{ hole: { number: 'asc' } }],
    })

    return successResponse(scores)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/trips/[tripId]/rounds/[roundId]/matches/[matchId]/scores
// Upsert scores for a single hole — the critical endpoint
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string; roundId: string; matchId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    // Verify user is a member of this trip
    const tripPlayer = await prisma.tripPlayer.findFirst({
      where: { tripId: params.tripId, userId: auth.dbUser.id },
    })
    if (!tripPlayer) return errorResponse('You are not a member of this trip', 'FORBIDDEN', 403)

    const body = await request.json()
    const validated = upsertScoresSchema.parse(body)

    // Load match with round, trip, and tee data
    const match = await prisma.match.findFirst({
      where: {
        id: params.matchId,
        roundId: params.roundId,
        round: { tripId: params.tripId },
      },
      include: {
        round: {
          include: {
            trip: { select: { defaultMaxScore: true } },
          },
        },
        players: true,
      },
    })

    if (!match) return errorResponse('Match not found', 'NOT_FOUND', 404)

    // Check verification status — reject edits on verified rounds
    if (match.round.verificationStatus !== 'UNVERIFIED') {
      return errorResponse('This round has been verified and scores cannot be edited', 'FORBIDDEN', 403)
    }

    // Load the hole data
    const hole = await prisma.hole.findUnique({
      where: { id: validated.holeId },
    })
    if (!hole) return errorResponse('Hole not found', 'NOT_FOUND', 404)

    // Determine effective max score
    const effectiveMaxScore = match.round.maxScore ?? match.round.trip.defaultMaxScore

    // Process each score in a transaction
    const upsertedScores = await prisma.$transaction(async (tx) => {
      const results = []

      for (const scoreInput of validated.scores) {
        // Find the match player
        const matchPlayer = match.players.find(mp => mp.id === scoreInput.matchPlayerId)
        if (!matchPlayer) {
          throw new Error(`Match player ${scoreInput.matchPlayerId} not found in this match`)
        }

        // Determine strokes received on this hole
        const hasStroke = receivesStroke(matchPlayer.playingHandicap, hole.handicap)
        const hasDoubleStroke = receivesDoubleStroke(matchPlayer.playingHandicap, hole.handicap)
        const strokesReceived = hasDoubleStroke ? 2 : hasStroke ? 1 : 0

        // Apply max score cap
        const cappedGross = applyMaxScore(scoreInput.grossScore, hole.par, effectiveMaxScore)

        // Compute net score
        const net = netScore(cappedGross, strokesReceived)

        // Upsert the score (unique on matchPlayerId + holeId)
        const score = await tx.score.upsert({
          where: {
            matchPlayerId_holeId: {
              matchPlayerId: scoreInput.matchPlayerId,
              holeId: validated.holeId,
            },
          },
          create: {
            matchPlayerId: scoreInput.matchPlayerId,
            tripPlayerId: matchPlayer.tripPlayerId,
            holeId: validated.holeId,
            grossScore: cappedGross,
            netScore: net,
            strokeReceived: hasStroke || hasDoubleStroke,
            driveUsed: scoreInput.driveUsed ?? null,
          },
          update: {
            grossScore: cappedGross,
            netScore: net,
            strokeReceived: hasStroke || hasDoubleStroke,
            driveUsed: scoreInput.driveUsed ?? null,
          },
        })

        results.push(score)
      }

      // If match is PENDING, flip to IN_PROGRESS
      if (match.status === 'PENDING') {
        await tx.match.update({
          where: { id: params.matchId },
          data: { status: 'IN_PROGRESS' },
        })
      }

      // Clear attestation — any score edit requires both sides to re-confirm
      if (match.side1Attested || match.side2Attested) {
        await tx.match.update({
          where: { id: params.matchId },
          data: { side1Attested: false, side2Attested: false },
        })
      }

      return results
    })

    return successResponse(upsertedScores)
  } catch (error) {
    return handleApiError(error)
  }
}
