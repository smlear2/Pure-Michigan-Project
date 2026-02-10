// ===========================================
// TYPES - Flexible Golf Trip Tracker
// Everything is customizable - no hardcoded values
// ===========================================

// Match formats available
export type MatchFormat = 
  | 'FOURBALL'    // Best ball: 2v2, each plays own ball, take best score
  | 'FOURSOMES'   // Alternate shot: 2v2, one ball per team
  | 'SCRAMBLE'    // Best shot: team plays from best position
  | 'SINGLES'     // 1v1 match play
  | 'STROKEPLAY'  // Individual stroke play
  | 'STABLEFORD'  // Points-based scoring
  | 'CHAPMAN';    // Modified alternate shot

export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';

// ===========================================
// CORE ENTITIES
// ===========================================

// A Trip is the top-level container (tournament, event, etc.)
export interface Trip {
  id: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  
  // Scoring rules
  pointsForWin: number;   // Usually 1
  pointsForHalf: number;  // Usually 0.5
  pointsToWin?: number;   // Optional clinching number
  
  // Event type
  isTeamEvent: boolean;
  
  // Skins settings
  skinsEntryFee: number;
  skinsCarryover: boolean;
  
  // Relations (when loaded)
  teams?: Team[];
  players?: Player[];
  rounds?: Round[];
  mvpConfig?: MVPConfig;
}

// A Team (flexible naming - not locked to US/Europe)
export interface Team {
  id: string;
  tripId: string;
  name: string;       // Any name: "USA", "Europe", "Shirts", "Team Alpha"
  color: string;      // Hex color
  sortOrder: number;
  players?: Player[];
}

// A Player in a trip
export interface Player {
  id: string;
  tripId: string;
  teamId?: string;     // Optional for individual events
  team?: Team;
  name: string;
  handicapIndex: number;
  email?: string;
  phone?: string;
}

// ===========================================
// COURSE ENTITIES
// ===========================================

export interface Course {
  id: string;
  name: string;
  location?: string;
  website?: string;
  tees?: Tee[];
}

export interface Tee {
  id: string;
  courseId: string;
  course?: Course;
  name: string;     // "Blue", "White", "Purple", etc.
  color: string;    // Hex color
  rating: number;   // Course rating (e.g., 71.4)
  slope: number;    // Slope rating (e.g., 135)
  holes?: Hole[];
}

export interface Hole {
  id: string;
  teeId: string;
  number: number;    // 1-18
  par: number;       // 3, 4, or 5
  yardage: number;
  handicap: number;  // Stroke index (1 = hardest, 18 = easiest)
}

// ===========================================
// ROUND & MATCH ENTITIES
// ===========================================

export interface Round {
  id: string;
  tripId: string;
  teeId: string;
  tee?: Tee;
  roundNumber: number;
  name?: string;        // Optional: "Day 1 - Morning"
  date?: Date;
  format: MatchFormat;
  skinsEnabled: boolean;
  isComplete: boolean;
  matches?: Match[];
}

export interface Match {
  id: string;
  roundId: string;
  round?: Round;
  matchNumber: number;
  status: MatchStatus;
  resultText?: string;    // "3&2", "1UP", "Halved"
  team1Points: number;
  team2Points: number;
  players?: MatchPlayer[];
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  player?: Player;
  courseHandicap: number;   // Calculated for this course
  playingHandicap: number;  // Strokes received in this match
  teamPosition: number;     // 1 or 2 (which side of match)
  scores?: Score[];
}

export interface Score {
  id: string;
  matchPlayerId: string;
  playerId: string;
  holeId: string;
  hole?: Hole;
  grossScore: number;
  netScore: number;
  strokeReceived: boolean;
}

// ===========================================
// SKINS & MVP
// ===========================================

export interface Skin {
  id: string;
  roundId: string;
  holeId: string;
  hole?: Hole;
  winnerId?: string;
  winner?: Player;
  netScore?: number;
  value?: number;
}

export interface MVPConfig {
  id: string;
  tripId: string;
  matchPointsWeight: number;
  holesWonWeight: number;
  scoringWeight: number;
  vsIndexWeight: number;
  skinsWeight: number;
  birdiesWeight: number;
  eaglesWeight: number;
}

// ===========================================
// COMPUTED/DISPLAY TYPES
// ===========================================

// Team standings display
export interface TeamStanding {
  teamId: string;
  teamName: string;
  teamColor: string;
  points: number;
  matchesWon: number;
  matchesLost: number;
  matchesHalved: number;
}

// Match status display
export interface MatchStatusDisplay {
  leadingTeam: 'TEAM1' | 'TEAM2' | 'TIED';
  margin: number;
  holesPlayed: number;
  holesRemaining: number;
  displayText: string;  // "2 UP", "AS", "3 DN"
}

// Player stats for MVP/leaderboard
export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  matchPoints: number;
  matchesPlayed: number;
  holesWon: number;
  holesLost: number;
  holesHalved: number;
  totalGrossStrokes: number;
  totalNetStrokes: number;
  roundsPlayed: number;
  avgScoreVsPar: number;
  avgVsIndex: number;
  skinsWon: number;
  skinsMoney: number;
  birdies: number;
  eagles: number;
  pars: number;
  bogeys: number;
  doubles: number;
  mvpScore?: number;
}

// Skins summary for a round
export interface RoundSkinsSummary {
  roundId: string;
  totalPot: number;
  skinsAwarded: number;
  skinValue: number;
  results: {
    holeNumber: number;
    winnerId?: string;
    winnerName?: string;
    winnerTeam?: string;
    netScore?: number;
  }[];
  playerTotals: {
    playerId: string;
    playerName: string;
    skinsWon: number;
    moneyWon: number;
  }[];
}

// Scorecard for display
export interface ScorecardDisplay {
  courseName: string;
  teeName: string;
  holes: Hole[];
  players: {
    player: Player;
    courseHandicap: number;
    playingHandicap: number;
    strokeHoles: number[];  // Which holes they get strokes on
    scores: (number | null)[];  // 18 values, null if not entered
  }[];
}

// ===========================================
// FORM/INPUT TYPES (for setup flows)
// ===========================================

export interface CreateTripInput {
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  isTeamEvent: boolean;
  pointsForWin?: number;
  pointsForHalf?: number;
  pointsToWin?: number;
  skinsEntryFee?: number;
  skinsCarryover?: boolean;
}

export interface CreateTeamInput {
  tripId: string;
  name: string;
  color: string;
}

export interface CreatePlayerInput {
  tripId: string;
  teamId?: string;
  name: string;
  handicapIndex: number;
  email?: string;
  phone?: string;
}

export interface CreateCourseInput {
  name: string;
  location?: string;
  website?: string;
}

export interface CreateTeeInput {
  courseId: string;
  name: string;
  color: string;
  rating: number;
  slope: number;
}

export interface CreateHoleInput {
  teeId: string;
  number: number;
  par: number;
  yardage: number;
  handicap: number;
}

export interface CreateRoundInput {
  tripId: string;
  teeId: string;
  roundNumber: number;
  name?: string;
  date?: Date;
  format: MatchFormat;
  skinsEnabled?: boolean;
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export const formatLabels: Record<MatchFormat, string> = {
  FOURBALL: 'Fourball (Best Ball)',
  FOURSOMES: 'Foursomes (Alternate Shot)',
  SCRAMBLE: 'Scramble',
  SINGLES: 'Singles',
  STROKEPLAY: 'Stroke Play',
  STABLEFORD: 'Stableford',
  CHAPMAN: 'Chapman/Pinehurst',
};

export const formatDescriptions: Record<MatchFormat, string> = {
  FOURBALL: '2v2 - Each player plays their own ball, best score counts',
  FOURSOMES: '2v2 - Partners alternate shots on a single ball',
  SCRAMBLE: 'Team plays from best shot each time',
  SINGLES: '1v1 individual match play',
  STROKEPLAY: 'Individual total strokes (lowest wins)',
  STABLEFORD: 'Points awarded based on score vs par',
  CHAPMAN: 'Both hit, switch balls, then alternate to finish',
};

// How many players per side for each format
export const formatPlayerCount: Record<MatchFormat, { min: number; max: number }> = {
  FOURBALL: { min: 2, max: 2 },
  FOURSOMES: { min: 2, max: 2 },
  SCRAMBLE: { min: 2, max: 4 },
  SINGLES: { min: 1, max: 1 },
  STROKEPLAY: { min: 1, max: 4 },
  STABLEFORD: { min: 1, max: 4 },
  CHAPMAN: { min: 2, max: 2 },
};
