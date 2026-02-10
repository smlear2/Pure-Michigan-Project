// ===========================================
// HANDICAP CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

export interface HoleInfo {
  number: number
  par: number
  handicap: number // Stroke index: 1 = hardest, 18 = easiest
}

/**
 * Calculate course handicap from handicap index and slope rating.
 * Formula: Math.round(index × slope / 113)
 */
export function courseHandicap(index: number, slope: number): number {
  return Math.round(index * slope / 113)
}

/**
 * Calculate playing handicap (strokes received in a match).
 * Each player's course handicap minus the lowest course handicap in the group.
 * Result is never negative.
 */
export function playingHandicap(courseHdcp: number, lowestInGroup: number): number {
  return Math.max(0, courseHdcp - lowestInGroup)
}

/**
 * Determine which holes a player receives a stroke on.
 * Returns array of hole numbers (1-18) where the player gets a stroke.
 *
 * A player with playing handicap N gets strokes on the N hardest holes
 * (lowest stroke index values). If handicap > 18, they get 2 strokes on
 * the hardest holes (handicap - 18 holes get double strokes).
 */
export function strokeAllocation(playingHdcp: number, holes: HoleInfo[]): number[] {
  if (playingHdcp <= 0) return []

  // Sort holes by stroke index (hardest first)
  const sorted = [...holes].sort((a, b) => a.handicap - b.handicap)

  const strokeHoles: number[] = []

  // First pass: everyone with hdcp >= 1 gets strokes on hardest holes
  const firstPassCount = Math.min(playingHdcp, sorted.length)
  for (let i = 0; i < firstPassCount; i++) {
    strokeHoles.push(sorted[i].number)
  }

  // Second pass: if hdcp > 18, additional strokes on hardest holes again
  if (playingHdcp > sorted.length) {
    const secondPassCount = Math.min(playingHdcp - sorted.length, sorted.length)
    for (let i = 0; i < secondPassCount; i++) {
      strokeHoles.push(sorted[i].number)
    }
  }

  return strokeHoles.sort((a, b) => a - b)
}

/**
 * Check if a player receives a stroke on a specific hole.
 */
export function receivesStroke(playingHdcp: number, holeStrokeIndex: number): boolean {
  if (playingHdcp <= 0) return false
  // First 18 strokes: get a stroke if stroke index <= handicap
  if (playingHdcp >= holeStrokeIndex) return true
  return false
}

/**
 * Check if a player receives TWO strokes on a specific hole (handicap > 18).
 */
export function receivesDoubleStroke(playingHdcp: number, holeStrokeIndex: number): boolean {
  if (playingHdcp <= 18) return false
  return (playingHdcp - 18) >= holeStrokeIndex
}
