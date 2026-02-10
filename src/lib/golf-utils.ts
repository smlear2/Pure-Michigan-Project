// ===========================================
// GOLF CALCULATIONS
// All the math for handicaps, scoring, etc.
// ===========================================

import { Hole, Score, MatchPlayer, MatchStatus, Player } from '@/types';

/**
 * Calculate course handicap from index and slope
 * Formula: Index × (Slope / 113)
 * 
 * Example: 8.5 index on 135 slope = 8.5 × (135/113) = 10.1 → 10
 */
export function calculateCourseHandicap(index: number, slope: number): number {
  return Math.round(index * (slope / 113));
}

/**
 * Calculate playing handicap (strokes received in a match)
 * In match play, everyone plays off the lowest handicap player
 * 
 * Example: If low man is 4 and you're 10, you get 6 strokes
 */
export function calculatePlayingHandicap(
  playerCourseHandicap: number,
  lowestCourseHandicap: number
): number {
  return playerCourseHandicap - lowestCourseHandicap;
}

/**
 * Determine which holes a player receives strokes on
 * Strokes are allocated to the hardest holes first (lowest handicap index)
 * 
 * Returns array of hole numbers where player gets a stroke
 */
export function getStrokeHoles(playingHandicap: number, holes: Hole[]): number[] {
  if (playingHandicap <= 0) return [];
  
  // Sort holes by difficulty (handicap index 1 = hardest)
  const sortedHoles = [...holes].sort((a, b) => a.handicap - b.handicap);
  
  // Take the hardest N holes based on playing handicap
  const strokeHoles = sortedHoles
    .slice(0, playingHandicap)
    .map(h => h.number);
  
  return strokeHoles;
}

/**
 * Calculate net score for a hole
 */
export function calculateNetScore(
  grossScore: number,
  strokeReceived: boolean
): number {
  return strokeReceived ? grossScore - 1 : grossScore;
}

/**
 * Calculate match status after each hole
 * Positive = US winning, Negative = Europe winning
 */
export function calculateMatchStatus(
  usNetScore: number,
  europeNetScore: number,
  currentStatus: number
): number {
  if (usNetScore < europeNetScore) {
    return currentStatus + 1; // US won the hole
  } else if (europeNetScore < usNetScore) {
    return currentStatus - 1; // Europe won the hole
  }
  return currentStatus; // Hole halved
}

/**
 * Format match status for display
 * Examples: "2 UP", "3 DN", "AS" (all square)
 */
export function formatMatchStatus(
  status: number,
  holesPlayed: number,
  perspective: 'US' | 'EUROPE' = 'US'
): MatchStatus {
  const holesRemaining = 18 - holesPlayed;
  
  // Adjust status based on perspective
  const adjustedStatus = perspective === 'US' ? status : -status;
  
  let display: string;
  let leader: 'US' | 'EUROPE' | 'TIED';
  
  if (adjustedStatus > 0) {
    display = `${adjustedStatus} UP`;
    leader = perspective;
  } else if (adjustedStatus < 0) {
    display = `${Math.abs(adjustedStatus)} DN`;
    leader = perspective === 'US' ? 'EUROPE' : 'US';
  } else {
    display = 'AS';
    leader = 'TIED';
  }
  
  return {
    leader,
    margin: Math.abs(status),
    holesPlayed,
    holesRemaining,
    display
  };
}

/**
 * Determine match result
 * Returns result string like "3&2" or "1UP" or "Halved"
 */
export function determineMatchResult(
  finalStatus: number,
  holesRemaining: number
): string {
  if (finalStatus === 0) {
    return 'Halved';
  }
  
  const margin = Math.abs(finalStatus);
  
  if (holesRemaining === 0) {
    // Match went to 18
    return `${margin}UP`;
  } else {
    // Match ended early
    return `${margin}&${holesRemaining}`;
  }
}

/**
 * Check if match is still active (not dormie or finished)
 */
export function isMatchActive(status: number, holesRemaining: number): boolean {
  const margin = Math.abs(status);
  return margin <= holesRemaining;
}

/**
 * Calculate best ball score for a team (Fourball format)
 * Takes the lower net score between two players on each hole
 */
export function calculateBestBall(
  player1Scores: Score[],
  player2Scores: Score[]
): number[] {
  const bestBall: number[] = [];
  
  for (let i = 0; i < 18; i++) {
    const p1Score = player1Scores[i]?.netScore ?? 99;
    const p2Score = player2Scores[i]?.netScore ?? 99;
    bestBall.push(Math.min(p1Score, p2Score));
  }
  
  return bestBall;
}

/**
 * Calculate skins for a round
 * Returns array of skin results (winner or null if tied)
 */
export function calculateSkins(
  allScores: { playerId: string; playerName: string; holeNumber: number; netScore: number }[]
): { holeNumber: number; winnerId: string | null; winnerName: string | null; netScore: number | null }[] {
  const results: { holeNumber: number; winnerId: string | null; winnerName: string | null; netScore: number | null }[] = [];
  
  for (let hole = 1; hole <= 18; hole++) {
    const holeScores = allScores.filter(s => s.holeNumber === hole);
    
    if (holeScores.length === 0) {
      results.push({ holeNumber: hole, winnerId: null, winnerName: null, netScore: null });
      continue;
    }
    
    // Find the lowest score
    const minScore = Math.min(...holeScores.map(s => s.netScore));
    const winners = holeScores.filter(s => s.netScore === minScore);
    
    if (winners.length === 1) {
      // Outright winner - skin awarded
      results.push({
        holeNumber: hole,
        winnerId: winners[0].playerId,
        winnerName: winners[0].playerName,
        netScore: minScore
      });
    } else {
      // Tie - no skin awarded
      results.push({ holeNumber: hole, winnerId: null, winnerName: null, netScore: null });
    }
  }
  
  return results;
}

/**
 * Get score relative to par with formatting
 */
export function getScoreDisplay(gross: number, par: number): {
  diff: number;
  label: string;
  className: string;
} {
  const diff = gross - par;
  
  if (diff <= -2) {
    return { diff, label: 'Eagle', className: 'bg-eagle text-white' };
  } else if (diff === -1) {
    return { diff, label: 'Birdie', className: 'bg-birdie text-white' };
  } else if (diff === 0) {
    return { diff, label: 'Par', className: 'bg-par text-white' };
  } else if (diff === 1) {
    return { diff, label: 'Bogey', className: 'bg-bogey text-white' };
  } else {
    return { diff, label: `+${diff}`, className: 'bg-double text-white' };
  }
}

/**
 * Calculate total score for 9 holes
 */
export function calculateNineTotal(scores: Score[], startHole: number): {
  gross: number;
  net: number;
} {
  const nineScores = scores.filter(s => {
    const holeNum = s.hole?.number ?? 0;
    return holeNum >= startHole && holeNum < startHole + 9;
  });
  
  return {
    gross: nineScores.reduce((sum, s) => sum + s.grossScore, 0),
    net: nineScores.reduce((sum, s) => sum + s.netScore, 0)
  };
}

/**
 * Sort players by handicap (for determining strokes)
 */
export function sortByHandicap(players: MatchPlayer[]): MatchPlayer[] {
  return [...players].sort((a, b) => a.courseHandicap - b.courseHandicap);
}

/**
 * Get lowest handicap in a group
 */
export function getLowestHandicap(players: MatchPlayer[]): number {
  return Math.min(...players.map(p => p.courseHandicap));
}
