// ===========================================
// TILT CALCULATIONS
// Modified Stableford with multiplier mechanic
// Pure functions — no DB dependency
// ===========================================

export interface TiltConfig {
  points?: {
    albatross?: number
    eagle?: number
    birdie?: number
    par?: number
    bogey?: number
    doublePlus?: number
  }
  startingMultiplier?: number // For carryover from previous round
  startingStreak?: number
}

export interface TiltHoleScore {
  holeNumber: number
  playerScores: { playerId: string; netScore: number; par: number }[]
}

export interface TiltPlayerHole {
  holeNumber: number
  netVsPar: number
  basePoints: number
  multiplier: number
  points: number       // basePoints × multiplier
  runningTotal: number
}

export interface TiltPlayerResult {
  playerId: string
  totalPoints: number
  holes: TiltPlayerHole[]
  finalMultiplier: number
  finalStreak: number
}

export interface TiltResult {
  players: TiltPlayerResult[]
  totalPot: number
  entryFee: number
  playerCount: number
}

const DEFAULT_POINTS = {
  albatross: 16,
  eagle: 8,
  birdie: 4,
  par: 2,
  bogey: 0,
  doublePlus: -4,
}

/**
 * Map net-vs-par to base point value.
 */
function getBasePoints(
  netVsPar: number,
  pts: typeof DEFAULT_POINTS,
): number {
  if (netVsPar <= -3) return pts.albatross
  if (netVsPar === -2) return pts.eagle
  if (netVsPar === -1) return pts.birdie
  if (netVsPar === 0) return pts.par
  if (netVsPar === 1) return pts.bogey
  return pts.doublePlus // +2 or worse
}

/**
 * Calculate TILT results for a round.
 *
 * Rules:
 * - Modified Stableford with multiplier mechanic
 * - Multiplier starts at 1x (or startingMultiplier for carryover)
 * - After net birdie: streak++, multiplier = streak + 1 for next hole
 * - Net eagle counts as two birdies (streak += 2)
 * - No cap on multiplier — grows indefinitely with consecutive birdies
 * - Net par: resets multiplier to 1x
 * - Bogey+: multiplier stays for THIS hole (you take the damage), then resets to 1x
 * - Multiplier applies to ALL points including negative
 *
 * @param holeScores - Per-hole net scores with par for each player
 * @param entryFee - Per-player buy-in
 * @param playerCount - Number of players
 * @param config - Point values and carryover settings
 */
export function calculateTilt(
  holeScores: TiltHoleScore[],
  entryFee: number,
  playerCount: number,
  config: TiltConfig = {},
): TiltResult {
  const pts = { ...DEFAULT_POINTS, ...config.points }
  const totalPot = entryFee * playerCount

  // Collect all unique player IDs
  const playerIds = new Set<string>()
  for (const hole of holeScores) {
    for (const ps of hole.playerScores) {
      playerIds.add(ps.playerId)
    }
  }

  const players: TiltPlayerResult[] = Array.from(playerIds).map(playerId => {
    let multiplier = config.startingMultiplier ?? 1
    let streak = config.startingStreak ?? 0
    let runningTotal = 0
    const holes: TiltPlayerHole[] = []

    for (const hole of holeScores) {
      const playerScore = hole.playerScores.find(ps => ps.playerId === playerId)
      if (!playerScore) continue

      const netVsPar = playerScore.netScore - playerScore.par
      const basePoints = getBasePoints(netVsPar, pts)
      const points = basePoints * multiplier
      runningTotal += points

      holes.push({
        holeNumber: hole.holeNumber,
        netVsPar,
        basePoints,
        multiplier,
        points,
        runningTotal,
      })

      // Update multiplier for NEXT hole
      if (netVsPar <= -1) {
        // Birdie or better — increase streak
        if (netVsPar <= -2) {
          // Eagle or better counts as two birdies
          streak += 2
        } else {
          streak += 1
        }
        multiplier = streak + 1 // No cap — multiplier grows with consecutive birdies
      } else if (netVsPar === 0) {
        // Par — reset
        streak = 0
        multiplier = 1
      } else {
        // Bogey or worse — took the hit this hole, now reset
        streak = 0
        multiplier = 1
      }
    }

    return {
      playerId,
      totalPoints: runningTotal,
      holes,
      finalMultiplier: multiplier,
      finalStreak: streak,
    }
  })

  // Sort by total points descending
  players.sort((a, b) => b.totalPoints - a.totalPoints)

  return {
    players,
    totalPot,
    entryFee,
    playerCount,
  }
}
