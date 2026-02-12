// ===========================================
// SHARED TILT COMPUTATION
// Pure function — computes TILT for a round using WHS skins handicaps
// ===========================================

import { calculateTilt, TiltHoleScore, TiltPlayerResult, TiltResult } from './tilt'
import {
  skinsHandicap,
  whsCourseHandicap,
  whsPlayingHandicap,
  receivesStroke,
  receivesDoubleStroke,
  HandicapConfig,
} from './handicap'

export interface TiltScoreInput {
  holeId: string
  grossScore: number
  tripPlayerId: string
}

export interface TiltPlayerInput {
  tripPlayerId: string
  handicapIndex: number
  tiltOptIn: boolean
}

export interface TiltTeeInput {
  slope: number
  rating: number
  holes: Array<{ id: string; number: number; par: number; handicap: number }>
}

export interface TiltCarryoverState {
  [playerId: string]: { multiplier: number; streak: number }
}

export interface ComputeTiltOutput {
  tiltResult: TiltResult
  uniquePlayerCount: number
  carryoverState: TiltCarryoverState
}

/**
 * Compute TILT for a single round using WHS skins handicaps.
 *
 * TILT is always individual scoring (never team-based).
 * Net scores are recomputed from gross scores using the same WHS skins
 * handicap formula used for skins (CEIL for 2023-2025, ROUND for 2026+).
 *
 * When carryoverIn is provided, each player starts with their carried-over
 * multiplier and streak from the previous round.
 */
export function computeTiltForRound(
  tee: TiltTeeInput,
  scores: TiltScoreInput[],
  players: TiltPlayerInput[],
  hdcpConfig: HandicapConfig | null,
  entryFee: number,
  playerCount: number,
  carryoverIn?: TiltCarryoverState,
): ComputeTiltOutput {
  const optedIn = new Set(players.filter(p => p.tiltOptIn).map(p => p.tripPlayerId))
  const playerIndexMap = new Map(players.map(p => [p.tripPlayerId, p.handicapIndex]))

  const skinsMax = hdcpConfig?.maxHandicap ?? 24
  const unified = hdcpConfig?.useUnifiedFormula ?? false
  const coursePar = tee.holes.reduce((sum, h) => sum + h.par, 0)

  // Compute TILT handicap (same formula as skins)
  function computePlayerTiltHdcp(index: number): number {
    if (unified) {
      const whs = whsCourseHandicap(index, tee.slope, tee.rating, coursePar)
      return whsPlayingHandicap(whs, 80, skinsMax)
    }
    return skinsHandicap(index, tee.slope, tee.rating, coursePar, skinsMax, 'ceil')
  }

  // Build handicap map
  const playerHdcps = new Map<string, number>()
  const uniquePlayers = new Set<string>()

  for (const score of scores) {
    const tpId = score.tripPlayerId
    if (!optedIn.has(tpId)) continue
    uniquePlayers.add(tpId)
    if (!playerHdcps.has(tpId)) {
      const index = playerIndexMap.get(tpId) ?? 0
      playerHdcps.set(tpId, computePlayerTiltHdcp(index))
    }
  }

  // Build hole scores with recomputed net scores
  const holeScoresMap = new Map<string, Map<string, { netScore: number; par: number }>>()

  for (const score of scores) {
    const tpId = score.tripPlayerId
    if (!optedIn.has(tpId)) continue
    const hole = tee.holes.find(h => h.id === score.holeId)
    if (!hole) continue

    if (!holeScoresMap.has(score.holeId)) holeScoresMap.set(score.holeId, new Map())
    const holeMap = holeScoresMap.get(score.holeId)!

    if (!holeMap.has(tpId)) {
      const hdcp = playerHdcps.get(tpId)!
      const hasStroke = receivesStroke(hdcp, hole.handicap)
      const hasDouble = receivesDoubleStroke(hdcp, hole.handicap)
      const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
      holeMap.set(tpId, { netScore: score.grossScore - strokesReceived, par: hole.par })
    }
  }

  // Convert to TiltHoleScore format ordered by hole number
  const holeScores: TiltHoleScore[] = tee.holes.map(hole => {
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

  // Calculate TILT — per player when carryover is active (each player may have different starting state)
  let allPlayerResults: TiltPlayerResult[]

  if (carryoverIn && Object.keys(carryoverIn).length > 0) {
    // Per-player calculation with individual carryover
    allPlayerResults = []
    for (const playerId of Array.from(uniquePlayers)) {
      const state = carryoverIn[playerId]
      const playerHoleScores: TiltHoleScore[] = holeScores.map(h => ({
        holeNumber: h.holeNumber,
        playerScores: h.playerScores.filter(ps => ps.playerId === playerId),
      }))
      const result = calculateTilt(playerHoleScores, 0, 1, {
        startingMultiplier: state?.multiplier,
        startingStreak: state?.streak,
      })
      if (result.players.length > 0) {
        allPlayerResults.push(result.players[0])
      }
    }
    allPlayerResults.sort((a, b) => b.totalPoints - a.totalPoints)
  } else {
    const result = calculateTilt(holeScores, entryFee, playerCount)
    allPlayerResults = result.players
  }

  // Build carryover state for next round
  const carryoverState: TiltCarryoverState = {}
  for (const p of allPlayerResults) {
    carryoverState[p.playerId] = {
      multiplier: p.finalMultiplier,
      streak: p.finalStreak,
    }
  }

  const tiltResult: TiltResult = {
    players: allPlayerResults,
    totalPot: entryFee * playerCount,
    entryFee,
    playerCount,
  }

  return { tiltResult, uniquePlayerCount: uniquePlayers.size, carryoverState }
}

/**
 * Calculate TILT payouts using top-3 split: 60% / 30% / 10%.
 * Ties split the combined prize money for the positions they occupy
 * (standard golf payout tie-splitting).
 */
const TILT_PAYOUT_PERCENTAGES = [0.60, 0.30, 0.10]

export function calculateTiltPayouts(
  grandTotals: Map<string, number>,
  pot: number,
): Map<string, number> {
  const payouts = new Map<string, number>()
  if (grandTotals.size === 0 || pot === 0) return payouts

  const sorted = Array.from(grandTotals.entries()).sort((a, b) => b[1] - a[1])

  let position = 0
  let i = 0
  while (i < sorted.length && position < TILT_PAYOUT_PERCENTAGES.length) {
    const score = sorted[i][1]
    const tiedPlayers: string[] = []
    while (i < sorted.length && sorted[i][1] === score) {
      tiedPlayers.push(sorted[i][0])
      i++
    }

    let totalPct = 0
    for (let p = position; p < Math.min(position + tiedPlayers.length, TILT_PAYOUT_PERCENTAGES.length); p++) {
      totalPct += TILT_PAYOUT_PERCENTAGES[p]
    }

    const perPlayer = (totalPct * pot) / tiedPlayers.length
    for (const playerId of tiedPlayers) {
      payouts.set(playerId, perPlayer)
    }

    position += tiedPlayers.length
  }

  return payouts
}
