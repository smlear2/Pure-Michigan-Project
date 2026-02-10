// ===========================================
// MATCH PLAY CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

export type HoleResult = 'SIDE1' | 'SIDE2' | 'HALVED' | null

export interface MatchState {
  holesPlayed: number
  holesRemaining: number
  side1Lead: number         // Positive = side1 up, negative = side2 up
  isComplete: boolean
  isDormie: boolean         // |lead| === holesRemaining (can only halve or lose)
  displayText: string       // "2 UP", "AS", "1 DN" (from side1 perspective)
  resultText: string | null // "3&2", "1UP", "Halved" — only set when complete
  side1Points: number
  side2Points: number
}

/**
 * Best ball: return the lowest score from an array of net scores.
 * Null entries are skipped (player didn't score). Returns null if no valid scores.
 */
export function bestBall(netScores: (number | null)[]): number | null {
  const valid = netScores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

/**
 * Determine the winner of a single hole.
 * Lower net score wins. Equal = halved. Null if either side has no score.
 */
export function holeWinner(side1Net: number | null, side2Net: number | null): HoleResult {
  if (side1Net === null || side2Net === null) return null
  if (side1Net < side2Net) return 'SIDE1'
  if (side2Net < side1Net) return 'SIDE2'
  return 'HALVED'
}

/**
 * Compute the full match state from hole-by-hole results.
 *
 * Match play rules:
 * - Track running lead hole by hole
 * - Match is closed out when |lead| > holesRemaining
 * - Dormie: |lead| === holesRemaining (leading player can only win or halve)
 * - Result format: closed out = "{lead}&{remaining}", went to 18 = "{lead}UP" or "Halved"
 */
export function computeMatchState(
  holeResults: HoleResult[],
  totalHoles: number,
  pointsForWin: number,
  pointsForHalf: number,
): MatchState {
  let side1Lead = 0
  let holesPlayed = 0
  let matchClosedAt: number | null = null

  for (let i = 0; i < holeResults.length; i++) {
    const result = holeResults[i]
    if (result === null) continue // No score yet for this hole

    holesPlayed++

    if (result === 'SIDE1') side1Lead++
    else if (result === 'SIDE2') side1Lead--
    // HALVED: no change

    const holesRemaining = totalHoles - holesPlayed

    // Check for closeout: lead exceeds remaining holes (but not on the final hole)
    if (Math.abs(side1Lead) > holesRemaining && holesRemaining > 0) {
      matchClosedAt = holesPlayed
      break
    }
  }

  const holesRemaining = totalHoles - holesPlayed
  const isComplete = matchClosedAt !== null || (holesPlayed === totalHoles)
  const isDormie = !isComplete && Math.abs(side1Lead) === holesRemaining && holesRemaining > 0

  // Build display text (current status from side1 perspective)
  let displayText: string
  if (side1Lead === 0) {
    displayText = 'AS' // All Square
  } else if (side1Lead > 0) {
    displayText = `${side1Lead} UP`
  } else {
    displayText = `${Math.abs(side1Lead)} DN`
  }

  if (isDormie) {
    displayText += ' (Dormie)'
  }

  // Build result text (only when complete)
  let resultText: string | null = null
  let side1Points = 0
  let side2Points = 0

  if (isComplete) {
    if (side1Lead === 0) {
      resultText = 'Halved'
      side1Points = pointsForHalf
      side2Points = pointsForHalf
    } else if (matchClosedAt !== null) {
      // Closed out before 18
      const remaining = totalHoles - matchClosedAt
      const lead = Math.abs(side1Lead)
      resultText = `${lead}&${remaining}`
      if (side1Lead > 0) {
        side1Points = pointsForWin
      } else {
        side2Points = pointsForWin
      }
    } else {
      // Went to final hole
      resultText = `${Math.abs(side1Lead)}UP`
      if (side1Lead > 0) {
        side1Points = pointsForWin
      } else {
        side2Points = pointsForWin
      }
    }
  }

  return {
    holesPlayed,
    holesRemaining,
    side1Lead,
    isComplete,
    isDormie,
    displayText,
    resultText,
    side1Points,
    side2Points,
  }
}
