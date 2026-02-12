// ===========================================
// GOLF CALCULATION ENGINE — Barrel Export
// ===========================================

export {
  courseHandicap,
  whsCourseHandicap,
  whsPlayingHandicap,
  playingHandicap,
  strokeAllocation,
  receivesStroke,
  receivesDoubleStroke,
  adjustedHandicap,
  teamHandicap,
  computeMatchHandicaps,
  isTeamFormat,
  skinsHandicap,
  teamSkinsHandicap,
  DEFAULT_HANDICAP_CONFIG,
} from './handicap'
export type {
  HoleInfo,
  HandicapConfig,
  TeamCombo,
  PlayerHandicapInput,
  PlayerHandicapResult,
} from './handicap'

export { applyMaxScore, netScore } from './scoring'

export {
  bestBall,
  holeWinner,
  computeMatchState,
} from './match-play'
export type { HoleResult, MatchState } from './match-play'

export { calculateSkins } from './skins'
export type { HoleSkinScore, SkinResult, SkinsResult } from './skins'

export { computeSkinsForRound } from './compute-skins'
export type { SkinsScoreInput, SkinsPlayerInput, SkinsTeeInput, SkinsPlayerPayout, ComputeSkinsOutput } from './compute-skins'

export { calculateTilt } from './tilt'
export type { TiltConfig, TiltHoleScore, TiltPlayerHole, TiltPlayerResult, TiltResult } from './tilt'
