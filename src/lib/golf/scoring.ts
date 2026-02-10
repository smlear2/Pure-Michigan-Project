// ===========================================
// SCORING CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

/**
 * Apply max score cap.
 * If maxScore is set (e.g., 3 = triple bogey), cap gross at par + maxScore.
 * If maxScore is null, no cap applied.
 */
export function applyMaxScore(gross: number, par: number, maxScore: number | null): number {
  if (maxScore === null || maxScore === undefined) return gross
  const cap = par + maxScore
  return Math.min(gross, cap)
}

/**
 * Calculate net score.
 * Net = gross - strokes received on this hole.
 * Standard: 1 stroke if receiving, 0 if not.
 * For handicaps > 18: can receive 2 strokes on hardest holes.
 */
export function netScore(gross: number, strokesReceived: number): number {
  return gross - strokesReceived
}
