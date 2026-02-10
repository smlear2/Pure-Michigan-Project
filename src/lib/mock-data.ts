// ===========================================
// MOCK DATA - Based on Michigan Open 2025
// This will be replaced with database calls
// ===========================================

import { Tournament, Team, Player, Course, Tee, Hole, Round, Match, MatchPlayer } from '@/types'

// Tournament
export const tournament: Tournament = {
  id: 'michigan-open-2025',
  name: 'Michigan Open',
  year: 2025,
  startDate: new Date('2025-09-25'),
  endDate: new Date('2025-09-28'),
  pointsToWin: 14,
  description: 'Annual Ryder Cup style tournament'
}

// Teams
export const teams: Team[] = [
  { id: 'team-us', name: 'US', color: '#002868', tournamentId: tournament.id },
  { id: 'team-europe', name: 'Europe', color: '#003399', tournamentId: tournament.id }
]

// Players - All 16 from your spreadsheet
export const players: Player[] = [
  // US Team
  { id: 'stephen-lear', name: 'Stephen Lear', handicapIndex: 8.5, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'joey-aiello', name: 'Joey Aiello', handicapIndex: 3.5, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'danny-morales', name: 'Danny Morales', handicapIndex: 6.9, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'dave-meyer', name: 'Dave Meyer', handicapIndex: 3.7, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'alex-paxton', name: 'Alex Paxton', handicapIndex: 9.7, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'dylan-plachta', name: 'Dylan Plachta', handicapIndex: 9.8, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'joe-spencer', name: 'Joe Spencer', handicapIndex: 19.9, tournamentId: tournament.id, teamId: 'team-us' },
  { id: 'ryan-hubona', name: 'Ryan Hubona', handicapIndex: 21.0, tournamentId: tournament.id, teamId: 'team-us' },
  // Europe Team
  { id: 'tom-bostwick', name: 'Tom Bostwick', handicapIndex: 11.7, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'ben-hammel', name: 'Ben Hammel', handicapIndex: 4.6, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'zach-lear', name: 'Zach Lear', handicapIndex: 5.8, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'joey-ways', name: 'Joey Ways Jr.', handicapIndex: 4.9, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'maxwell-huntley', name: 'Maxwell Huntley', handicapIndex: 9.5, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'eric-barkovich', name: 'Eric Barkovich', handicapIndex: 12.8, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'kip-owen', name: 'Kip Owen', handicapIndex: 17.7, tournamentId: tournament.id, teamId: 'team-europe' },
  { id: 'zack-stitt', name: 'Zack Stitt', handicapIndex: 21.6, tournamentId: tournament.id, teamId: 'team-europe' }
]

// Courses
export const courses: Course[] = [
  { id: 'crooked-tree', name: 'Crooked Tree', location: 'Petoskey, MI' },
  { id: 'bay-harbor-links-quarry', name: 'Bay Harbor - Links/Quarry', location: 'Bay Harbor, MI' },
  { id: 'bay-harbor-links-preserve', name: 'Bay Harbor - Links/Preserve', location: 'Bay Harbor, MI' },
  { id: 'donald-ross', name: 'Donald Ross Memorial', location: 'Boyne Highlands, MI' },
  { id: 'the-heather', name: 'The Heather', location: 'Boyne Highlands, MI' },
  { id: 'arthur-hills', name: 'Arthur Hills', location: 'Boyne Highlands, MI' }
]

// Tees for Crooked Tree (example - Purple tees)
export const crookedTreePurpleTee: Tee = {
  id: 'crooked-tree-purple',
  courseId: 'crooked-tree',
  name: 'Purple',
  color: '#800080',
  rating: 71.4,
  slope: 135
}

// Holes for Crooked Tree Purple
export const crookedTreeHoles: Hole[] = [
  { id: 'ct-1', teeId: 'crooked-tree-purple', number: 1, par: 4, yardage: 376, handicap: 7 },
  { id: 'ct-2', teeId: 'crooked-tree-purple', number: 2, par: 3, yardage: 166, handicap: 11 },
  { id: 'ct-3', teeId: 'crooked-tree-purple', number: 3, par: 4, yardage: 403, handicap: 3 },
  { id: 'ct-4', teeId: 'crooked-tree-purple', number: 4, par: 4, yardage: 388, handicap: 1 },
  { id: 'ct-5', teeId: 'crooked-tree-purple', number: 5, par: 3, yardage: 166, handicap: 13 },
  { id: 'ct-6', teeId: 'crooked-tree-purple', number: 6, par: 5, yardage: 532, handicap: 9 },
  { id: 'ct-7', teeId: 'crooked-tree-purple', number: 7, par: 4, yardage: 388, handicap: 5 },
  { id: 'ct-8', teeId: 'crooked-tree-purple', number: 8, par: 3, yardage: 160, handicap: 15 },
  { id: 'ct-9', teeId: 'crooked-tree-purple', number: 9, par: 5, yardage: 470, handicap: 17 },
  { id: 'ct-10', teeId: 'crooked-tree-purple', number: 10, par: 4, yardage: 431, handicap: 8 },
  { id: 'ct-11', teeId: 'crooked-tree-purple', number: 11, par: 3, yardage: 170, handicap: 14 },
  { id: 'ct-12', teeId: 'crooked-tree-purple', number: 12, par: 4, yardage: 405, handicap: 2 },
  { id: 'ct-13', teeId: 'crooked-tree-purple', number: 13, par: 5, yardage: 551, handicap: 6 },
  { id: 'ct-14', teeId: 'crooked-tree-purple', number: 14, par: 4, yardage: 377, handicap: 12 },
  { id: 'ct-15', teeId: 'crooked-tree-purple', number: 15, par: 3, yardage: 173, handicap: 16 },
  { id: 'ct-16', teeId: 'crooked-tree-purple', number: 16, par: 4, yardage: 376, handicap: 10 },
  { id: 'ct-17', teeId: 'crooked-tree-purple', number: 17, par: 5, yardage: 474, handicap: 18 },
  { id: 'ct-18', teeId: 'crooked-tree-purple', number: 18, par: 4, yardage: 390, handicap: 4 }
]

// Rounds configuration from 2025
export const rounds: Round[] = [
  {
    id: 'round-1',
    tournamentId: tournament.id,
    courseId: 'crooked-tree',
    teeId: 'crooked-tree-purple',
    roundNumber: 1,
    day: 'Thursday',
    format: 'FOURBALL',
    skinsEnabled: true
  },
  {
    id: 'round-2',
    tournamentId: tournament.id,
    courseId: 'bay-harbor-links-quarry',
    teeId: 'bay-harbor-lq-purple',
    roundNumber: 2,
    day: 'Friday AM',
    format: 'FOURBALL',
    skinsEnabled: true
  },
  {
    id: 'round-3',
    tournamentId: tournament.id,
    courseId: 'bay-harbor-links-preserve',
    teeId: 'bay-harbor-lp-orange',
    roundNumber: 3,
    day: 'Friday PM',
    format: 'FOURSOMES',
    skinsEnabled: true
  },
  {
    id: 'round-4',
    tournamentId: tournament.id,
    courseId: 'donald-ross',
    teeId: 'donald-ross-orange',
    roundNumber: 4,
    day: 'Saturday AM',
    format: 'FOURBALL',
    skinsEnabled: true
  },
  {
    id: 'round-5',
    tournamentId: tournament.id,
    courseId: 'the-heather',
    teeId: 'heather-orange',
    roundNumber: 5,
    day: 'Saturday PM',
    format: 'SCRAMBLE',
    skinsEnabled: true
  },
  {
    id: 'round-6',
    tournamentId: tournament.id,
    courseId: 'arthur-hills',
    teeId: 'arthur-hills-orange',
    roundNumber: 6,
    day: 'Sunday',
    format: 'SINGLES',
    skinsEnabled: true
  }
]

// Match results from 2025 (final scores)
export const matchResults = {
  round1: {
    usPoints: 2.5,
    europePoints: 1.5,
    matches: [
      { matchNumber: 1, usPlayers: ['Dylan Plachta', 'Joe Spencer'], europePlayers: ['Maxwell Huntley', 'Eric Barkovich'], result: 'Halved', usPoints: 0.5, europePoints: 0.5 },
      { matchNumber: 2, usPlayers: ['Alex Paxton', 'Ryan Hubona'], europePlayers: ['Joey Ways Jr.', 'Kip Owen'], result: 'US 1UP', usPoints: 1, europePoints: 0 },
      { matchNumber: 3, usPlayers: ['Joey Aiello', 'Danny Morales'], europePlayers: ['Ben Hammel', 'Tom Bostwick'], result: 'Europe 2&1', usPoints: 0, europePoints: 1 },
      { matchNumber: 4, usPlayers: ['Dave Meyer', 'Stephen Lear'], europePlayers: ['Zach Lear', 'Zack Stitt'], result: 'US 4&3', usPoints: 1, europePoints: 0 }
    ]
  },
  round2: { usPoints: 1.5, europePoints: 2.5 },
  round3: { usPoints: 2, europePoints: 2 },
  round4: { usPoints: 3.5, europePoints: 0.5 },
  round5: { usPoints: 2.5, europePoints: 1.5 },
  round6: { usPoints: 4, europePoints: 4 }
}

// Final tournament standings
export const finalStandings = {
  usPoints: 16,
  europePoints: 12,
  winner: 'US'
}

// Helper functions
export function getPlayer(id: string): Player | undefined {
  return players.find(p => p.id === id)
}

export function getPlayersByTeam(teamId: string): Player[] {
  return players.filter(p => p.teamId === teamId)
}

export function getCourse(id: string): Course | undefined {
  return courses.find(c => c.id === id)
}

export function getRound(roundNumber: number): Round | undefined {
  return rounds.find(r => r.roundNumber === roundNumber)
}

// Format labels
export const formatLabels: Record<string, string> = {
  'FOURBALL': 'Fourball (Best Ball)',
  'FOURSOMES': 'Foursomes (Alternate Shot)',
  'SCRAMBLE': '2-Man Scramble',
  'SINGLES': 'Singles'
}
