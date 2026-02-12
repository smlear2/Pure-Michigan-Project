// ===========================================
// HANDICAP CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

export interface HoleInfo {
  number: number
  par: number
  handicap: number // Stroke index: 1 = hardest, 18 = easiest
}

// --- Handicap config types ---

export interface TeamCombo {
  lowPct: number   // percentage for the lower-handicap player (0-100)
  highPct: number  // percentage for the higher-handicap player (0-100)
}

export interface HandicapConfig {
  percentage: number           // 0-100, applied to all players' course handicaps
  offTheLow: boolean           // subtract lowest from all (standard match play)
  maxHandicap?: number | null  // Cap adjusted handicap at this value (e.g., 20)
  useUnifiedFormula?: boolean  // When true, use skins formula for both match play and skins
  teamCombos?: {
    [format: string]: TeamCombo
  }
  skinsTeamCombos?: {          // Team combos for skins (may differ from match play)
    [format: string]: TeamCombo
  }
}

export const DEFAULT_HANDICAP_CONFIG: HandicapConfig = {
  percentage: 100,
  offTheLow: true,
  maxHandicap: null,
  teamCombos: {},
}

export interface PlayerHandicapInput {
  tripPlayerId: string
  courseHdcp: number
  side: number
}

export interface PlayerHandicapResult {
  tripPlayerId: string
  courseHandicap: number
  playingHandicap: number
}

const TEAM_FORMATS = new Set(['FOURSOMES', 'SCRAMBLE', 'MODIFIED_ALT_SHOT'])

export function isTeamFormat(format: string): boolean {
  return TEAM_FORMATS.has(format)
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

// --- WHS Course Handicap (2026+) ---

/**
 * WHS Course Handicap: ROUND(index × slope / 113 + (rating - par))
 *
 * This is the base for ALL handicap calculations in 2026+.
 * Match play and skins both start from this value, then apply allowance/cap differently.
 */
export function whsCourseHandicap(
  index: number,
  slope: number,
  rating: number,
  par: number,
): number {
  return Math.round(index * slope / 113 + (rating - par))
}

/**
 * Apply allowance percentage and cap to a WHS course handicap.
 * Formula: min(max, max(0, ROUND(courseHdcp × pct / 100)))
 *
 * Used for 2026+ skins and match play after whsCourseHandicap().
 */
export function whsPlayingHandicap(
  courseHdcp: number,
  pct: number = 80,
  maxHdcp: number = 24,
): number {
  return Math.min(maxHdcp, Math.max(0, Math.round(courseHdcp * pct / 100)))
}

// --- Legacy skins handicap (2023-2025) ---

/**
 * Calculate skins handicap from handicap index and course data.
 * Formula: min(maxHdcp, max(0, CEIL((index × slope/113 + (rating - par)) × 0.8)))
 *
 * Legacy formula (2023-2025): applies 0.8 in one step with CEIL rounding.
 * For 2026+, use whsCourseHandicap() + whsPlayingHandicap() instead.
 */
export function skinsHandicap(
  index: number,
  slope: number,
  rating: number,
  par: number,
  maxHdcp: number = 20,
  rounding: 'ceil' | 'round' = 'ceil',
): number {
  const raw = (index * slope / 113 + (rating - par)) * 0.8
  const rounded = rounding === 'ceil' ? Math.ceil(raw) : Math.round(raw)
  return Math.min(maxHdcp, Math.max(0, rounded))
}

/**
 * Calculate combined team skins handicap from individual skins handicaps.
 * Uses the same ROUND(low*lowPct/100 + high*highPct/100) as match-play teams.
 */
export function teamSkinsHandicap(
  individualHdcps: number[],
  lowPct: number,
  highPct: number,
): number {
  const sorted = [...individualHdcps].sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return Math.round(sorted[0] * lowPct / 100)
  return Math.round(sorted[0] * lowPct / 100 + sorted[1] * highPct / 100)
}

// --- Configurable handicap functions ---

/**
 * Apply a percentage to a course handicap (rounds UP per Excel ROUNDUP convention).
 * adjustedHandicap = ceil(courseHdcp × percentage / 100)
 */
export function adjustedHandicap(courseHdcp: number, percentage: number): number {
  return Math.ceil(courseHdcp * percentage / 100)
}

/**
 * Calculate combined team handicap from two players' adjusted handicaps.
 * Sorts by value (ascending), applies lowPct to lowest and highPct to highest.
 */
export function teamHandicap(adjustedHdcps: number[], lowPct: number, highPct: number): number {
  const sorted = [...adjustedHdcps].sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return Math.round(sorted[0] * lowPct / 100)
  return Math.round(sorted[0] * lowPct / 100 + sorted[1] * highPct / 100)
}

/**
 * Compute playing handicaps for all players in a match.
 *
 * For individual formats (FOURBALL, SINGLES, etc.):
 *   1. adjustedHdcp = round(courseHdcp × percentage / 100)
 *   2. playingHdcp = adjustedHdcp - min(all adjusted) [if offTheLow]
 *
 * For team formats (FOURSOMES, SCRAMBLE, etc.):
 *   1. adjustedHdcp per player = round(courseHdcp × percentage / 100)
 *   2. Per side: teamHdcp = round(lowAdjusted × lowPct/100 + highAdjusted × highPct/100)
 *   3. playingHdcp = teamHdcp - min(all teamHdcps) [if offTheLow]
 *   4. Both players on a side get the same playingHandicap
 */
export function computeMatchHandicaps(
  players: PlayerHandicapInput[],
  format: string,
  config: HandicapConfig | null,
): PlayerHandicapResult[] {
  const cfg = config ?? DEFAULT_HANDICAP_CONFIG
  const pct = cfg.percentage ?? 100

  if (isTeamFormat(format) && cfg.teamCombos?.[format]) {
    return computeTeamMatchHandicaps(players, format, cfg, pct)
  }
  return computeIndividualMatchHandicaps(players, cfg, pct)
}

function applyCap(value: number, max: number | null | undefined): number {
  if (max != null && value > max) return max
  return value
}

function computeIndividualMatchHandicaps(
  players: PlayerHandicapInput[],
  cfg: HandicapConfig,
  pct: number,
): PlayerHandicapResult[] {
  const adjusted = players.map(p => ({
    ...p,
    adjusted: applyCap(adjustedHandicap(p.courseHdcp, pct), cfg.maxHandicap),
  }))

  const lowest = cfg.offTheLow !== false
    ? Math.min(...adjusted.map(a => a.adjusted))
    : 0

  return adjusted.map(p => ({
    tripPlayerId: p.tripPlayerId,
    courseHandicap: p.courseHdcp,
    playingHandicap: Math.max(0, p.adjusted - lowest),
  }))
}

function computeTeamMatchHandicaps(
  players: PlayerHandicapInput[],
  format: string,
  cfg: HandicapConfig,
  pct: number,
): PlayerHandicapResult[] {
  const combo = cfg.teamCombos![format]

  // Step 1: Adjust each player's course handicap by the global percentage, then cap
  const adjusted = players.map(p => ({
    ...p,
    adjusted: applyCap(adjustedHandicap(p.courseHdcp, pct), cfg.maxHandicap),
  }))

  // Step 2: Group by side and compute team handicaps
  const sides = new Map<number, typeof adjusted>()
  for (const p of adjusted) {
    if (!sides.has(p.side)) sides.set(p.side, [])
    sides.get(p.side)!.push(p)
  }

  const sideTeamHdcps = new Map<number, number>()
  Array.from(sides.entries()).forEach(([side, sidePlayers]) => {
    const hdcps = sidePlayers.map(p => p.adjusted)
    sideTeamHdcps.set(side, teamHandicap(hdcps, combo.lowPct, combo.highPct))
  })

  // Step 3: Off the low — subtract lowest team handicap
  const lowest = cfg.offTheLow !== false
    ? Math.min(...Array.from(sideTeamHdcps.values()))
    : 0

  // Step 4: Both players on a side get the same playing handicap
  return adjusted.map(p => ({
    tripPlayerId: p.tripPlayerId,
    courseHandicap: p.courseHdcp,
    playingHandicap: Math.max(0, sideTeamHdcps.get(p.side)! - lowest),
  }))
}
