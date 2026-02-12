// ===========================================
// SHARED SKINS COMPUTATION
// Pure function — computes skins for a round using WHS skins handicaps
// ===========================================

import { calculateSkins, HoleSkinScore, SkinsResult } from './skins'
import {
  whsCourseHandicap,
  whsPlayingHandicap,
  skinsHandicap,
  teamSkinsHandicap,
  receivesStroke,
  receivesDoubleStroke,
  isTeamFormat,
  HandicapConfig,
} from './handicap'

export interface SkinsScoreInput {
  holeId: string
  grossScore: number
  tripPlayerId: string
  matchId: string
  side: number
}

export interface SkinsPlayerInput {
  tripPlayerId: string
  handicapIndex: number
  skinsOptIn: boolean
}

export interface SkinsTeeInput {
  slope: number
  rating: number
  holes: Array<{ id: string; number: number; par: number; handicap: number }>
}

export interface SkinsPlayerPayout {
  playerId: string
  skinsWon: number
  moneyWon: number
}

export interface ComputeSkinsOutput {
  skinsResult: SkinsResult
  playerPayouts: SkinsPlayerPayout[]
  uniquePlayerCount: number
  teamMembersMap: Map<string, string[]>
}

/**
 * Compute skins for a single round using proper WHS skins handicaps.
 *
 * Format-specific logic:
 * - FOURBALL / SINGLES: Individual WHS net scores (CEIL rounding, cap 24)
 * - SCRAMBLE: Gross scores with team dedup (no handicap)
 * - FOURSOMES: Team WHS handicap via skinsTeamCombos, with team dedup
 */
export function computeSkinsForRound(
  format: string,
  tee: SkinsTeeInput,
  scores: SkinsScoreInput[],
  players: SkinsPlayerInput[],
  hdcpConfig: HandicapConfig | null,
  entryFee: number,
  carryover: boolean,
): ComputeSkinsOutput {
  const optedIn = new Set(players.filter(p => p.skinsOptIn).map(p => p.tripPlayerId))
  const playerIndexMap = new Map(players.map(p => [p.tripPlayerId, p.handicapIndex]))

  const teamFormat = isTeamFormat(format)
  const isScramble = format === 'SCRAMBLE'
  const skinsMax = hdcpConfig?.maxHandicap ?? 24
  const unified = hdcpConfig?.useUnifiedFormula ?? false
  const coursePar = tee.holes.reduce((sum, h) => sum + h.par, 0)

  // Prefer skinsTeamCombos, fall back to teamCombos
  const skinsTeamCombos = hdcpConfig?.skinsTeamCombos ?? hdcpConfig?.teamCombos ?? {}

  // Compute skins handicap for a player
  function computePlayerSkinsHdcp(index: number): number {
    if (unified) {
      // 2026+: WHS two-step — one formula for everything
      const whs = whsCourseHandicap(index, tee.slope, tee.rating, coursePar)
      return whsPlayingHandicap(whs, 80, skinsMax)
    }
    // 2023-2025: legacy one-step CEIL formula
    return skinsHandicap(index, tee.slope, tee.rating, coursePar, skinsMax, 'ceil')
  }

  // 1. Compute individual skins handicaps
  const playerSkinsHdcps = new Map<string, number>()
  const uniquePlayers = new Set<string>()

  for (const score of scores) {
    const tpId = score.tripPlayerId
    if (!optedIn.has(tpId)) continue
    uniquePlayers.add(tpId)
    if (!playerSkinsHdcps.has(tpId)) {
      if (isScramble) {
        playerSkinsHdcps.set(tpId, 0)
      } else {
        const index = playerIndexMap.get(tpId) ?? 0
        playerSkinsHdcps.set(tpId, computePlayerSkinsHdcp(index))
      }
    }
  }

  // 2. Team grouping
  const teamMembersMap = new Map<string, string[]>()

  if (teamFormat) {
    for (const score of scores) {
      if (!optedIn.has(score.tripPlayerId)) continue
      const teamKey = `${score.matchId}:${score.side}`
      if (!teamMembersMap.has(teamKey)) teamMembersMap.set(teamKey, [])
      const members = teamMembersMap.get(teamKey)!
      if (!members.includes(score.tripPlayerId)) members.push(score.tripPlayerId)
    }
  }

  // 3. Compute team skins handicaps (for Foursomes — Scramble uses gross)
  const teamSkinsHdcpMap = new Map<string, number>()

  if (teamFormat && !isScramble && skinsTeamCombos[format]) {
    const combo = skinsTeamCombos[format]
    Array.from(teamMembersMap.entries()).forEach(([teamKey, members]) => {
      const hdcps = members.map(id => playerSkinsHdcps.get(id)!)
      teamSkinsHdcpMap.set(teamKey, teamSkinsHandicap(hdcps, combo.lowPct, combo.highPct))
    })
  }

  // 4. Build hole scores
  const holeScoresMap = new Map<string, Map<string, number>>()

  for (const score of scores) {
    if (!optedIn.has(score.tripPlayerId)) continue
    const hole = tee.holes.find(h => h.id === score.holeId)
    if (!hole) continue

    if (!holeScoresMap.has(score.holeId)) holeScoresMap.set(score.holeId, new Map())
    const holeMap = holeScoresMap.get(score.holeId)!

    if (teamFormat) {
      const teamKey = `${score.matchId}:${score.side}`
      if (!holeMap.has(teamKey)) {
        if (isScramble) {
          // Scramble: use gross scores directly
          holeMap.set(teamKey, score.grossScore)
        } else {
          // Foursomes: apply team handicap strokes
          const hdcp = teamSkinsHdcpMap.get(teamKey)
            ?? playerSkinsHdcps.get(score.tripPlayerId)!
          const hasStroke = receivesStroke(hdcp, hole.handicap)
          const hasDouble = receivesDoubleStroke(hdcp, hole.handicap)
          const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
          holeMap.set(teamKey, score.grossScore - strokesReceived)
        }
      }
    } else {
      // Individual: apply individual skins handicap strokes
      if (!holeMap.has(score.tripPlayerId)) {
        const hdcp = playerSkinsHdcps.get(score.tripPlayerId)!
        const hasStroke = receivesStroke(hdcp, hole.handicap)
        const hasDouble = receivesDoubleStroke(hdcp, hole.handicap)
        const strokesReceived = hasDouble ? 2 : hasStroke ? 1 : 0
        holeMap.set(score.tripPlayerId, score.grossScore - strokesReceived)
      }
    }
  }

  // 5. Determine expected competing unit count (for excluding incomplete holes)
  // A hole is only valid for skins if ALL competing units have a score
  const expectedUnitCount = teamFormat
    ? teamMembersMap.size  // number of teams
    : uniquePlayers.size   // number of individual players

  // 6. Convert to HoleSkinScore format, excluding incomplete holes
  const holeScores: HoleSkinScore[] = tee.holes.map(hole => {
    const holeMap = holeScoresMap.get(hole.id)
    if (!holeMap || holeMap.size < expectedUnitCount) {
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

  // 7. Calculate skins
  const skinsResult = calculateSkins(holeScores, entryFee, uniquePlayers.size, carryover)

  // 8. Distribute team winnings to individual players
  const playerPayouts: SkinsPlayerPayout[] = []

  if (teamFormat) {
    const payoutMap = new Map<string, SkinsPlayerPayout>()
    for (const pt of skinsResult.playerTotals) {
      const members = teamMembersMap.get(pt.playerId) ?? [pt.playerId]
      const perMember = pt.moneyWon / members.length
      for (const m of members) {
        const existing = payoutMap.get(m)
        if (existing) {
          existing.skinsWon += pt.skinsWon
          existing.moneyWon += perMember
        } else {
          payoutMap.set(m, { playerId: m, skinsWon: pt.skinsWon, moneyWon: perMember })
        }
      }
    }
    playerPayouts.push(...Array.from(payoutMap.values()))
  } else {
    for (const pt of skinsResult.playerTotals) {
      playerPayouts.push({ playerId: pt.playerId, skinsWon: pt.skinsWon, moneyWon: pt.moneyWon })
    }
  }

  return { skinsResult, playerPayouts, uniquePlayerCount: uniquePlayers.size, teamMembersMap }
}
