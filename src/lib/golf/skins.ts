// ===========================================
// SKINS CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

export interface HoleSkinScore {
  holeNumber: number
  playerScores: { playerId: string; netScore: number }[]
}

export interface SkinResult {
  holeNumber: number
  winnerId: string | null   // null = no winner (tie)
  winnerScore: number | null
  value: number             // Dollar value of this skin (0 if no winner)
}

export interface SkinsResult {
  totalPot: number
  skinsAwarded: number
  skinValue: number         // pot / skinsAwarded (0 if none awarded)
  holes: SkinResult[]
  playerTotals: { playerId: string; skinsWon: number; moneyWon: number }[]
}

/**
 * Calculate skins for a round.
 *
 * Rules:
 * - A skin is won by the player with the LOWEST UNIQUE net score on a hole
 * - If two or more players tie for the lowest score, NO skin is awarded
 * - No carryover (default): tied holes are simply lost, no accumulation
 * - With carryover: tied holes accumulate and go to next winner
 * - Pot = entryFee × playerCount
 * - Skin value = pot / skinsAwarded (variable)
 */
export function calculateSkins(
  holeScores: HoleSkinScore[],
  entryFee: number,
  playerCount: number,
  carryover: boolean = false,
): SkinsResult {
  const totalPot = entryFee * playerCount
  const holes: SkinResult[] = []
  const playerSkins: Map<string, number> = new Map()
  let carryoverCount = 0

  for (const hole of holeScores) {
    if (hole.playerScores.length === 0) {
      holes.push({ holeNumber: hole.holeNumber, winnerId: null, winnerScore: null, value: 0 })
      continue
    }

    // Find the lowest score
    const minScore = Math.min(...hole.playerScores.map(p => p.netScore))

    // Check if it's unique (only one player has it)
    const playersWithMin = hole.playerScores.filter(p => p.netScore === minScore)

    if (playersWithMin.length === 1) {
      // Winner! Award this skin (plus any carryover)
      const winnerId = playersWithMin[0].playerId
      const skinsForThisHole = 1 + carryoverCount
      carryoverCount = 0

      const current = playerSkins.get(winnerId) || 0
      playerSkins.set(winnerId, current + skinsForThisHole)

      holes.push({
        holeNumber: hole.holeNumber,
        winnerId,
        winnerScore: minScore,
        value: 0, // Will be calculated after we know total skins
      })
    } else {
      // Tie — no skin
      if (carryover) {
        carryoverCount++
      }
      holes.push({ holeNumber: hole.holeNumber, winnerId: null, winnerScore: null, value: 0 })
    }
  }

  // Calculate totals
  let skinsAwarded = 0
  playerSkins.forEach((count) => {
    skinsAwarded += count
  })

  const skinValue = skinsAwarded > 0 ? totalPot / skinsAwarded : 0

  // Set dollar values on winning holes
  for (const hole of holes) {
    if (hole.winnerId) {
      // Find how many skins this hole was worth
      // For no-carryover: always 1. For carryover: could be more.
      // We need to recalculate per-hole value
      hole.value = skinValue // Each skin unit is worth skinValue
    }
  }

  // Build player totals
  const playerTotals = Array.from(playerSkins.entries()).map(([playerId, skinsWon]) => ({
    playerId,
    skinsWon,
    moneyWon: skinsWon * skinValue,
  }))

  // Sort by money won descending
  playerTotals.sort((a, b) => b.moneyWon - a.moneyWon)

  return {
    totalPot,
    skinsAwarded,
    skinValue,
    holes,
    playerTotals,
  }
}
