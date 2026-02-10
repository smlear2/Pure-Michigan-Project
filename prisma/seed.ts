import { PrismaClient, MatchFormat } from '@prisma/client'

const prisma = new PrismaClient()

// ===========================================
// 2025 Michigan Open — Seed Data
// Source: data/Pure Michigan Scorecards 2025 vF.xlsx
// ===========================================

const PLAYERS = [
  // US Team
  { slug: 'stephen-lear', name: 'Stephen Lear', handicap: 8.5, team: 'US' },
  { slug: 'joey-aiello', name: 'Joey Aiello', handicap: 3.5, team: 'US' },
  { slug: 'danny-morales', name: 'Danny Morales', handicap: 6.9, team: 'US' },
  { slug: 'dave-meyer', name: 'Dave Meyer', handicap: 3.7, team: 'US' },
  { slug: 'alex-paxton', name: 'Alex Paxton', handicap: 9.7, team: 'US' },
  { slug: 'dylan-plachta', name: 'Dylan Plachta', handicap: 9.8, team: 'US' },
  { slug: 'joe-spencer', name: 'Joe Spencer', handicap: 19.9, team: 'US' },
  { slug: 'ryan-hubona', name: 'Ryan Hubona', handicap: 21.0, team: 'US' },
  // Europe Team
  { slug: 'tom-bostwick', name: 'Tom Bostwick', handicap: 11.7, team: 'Europe' },
  { slug: 'ben-hammel', name: 'Ben Hammel', handicap: 4.6, team: 'Europe' },
  { slug: 'zach-lear', name: 'Zach Lear', handicap: 5.8, team: 'Europe' },
  { slug: 'joey-ways', name: 'Joey Ways Jr.', handicap: 4.9, team: 'Europe' },
  { slug: 'maxwell-huntley', name: 'Maxwell Huntley', handicap: 9.5, team: 'Europe' },
  { slug: 'eric-barkovich', name: 'Eric Barkovich', handicap: 12.8, team: 'Europe' },
  { slug: 'kip-owen', name: 'Kip Owen', handicap: 17.7, team: 'Europe' },
  { slug: 'zack-stitt', name: 'Zack Stitt', handicap: 21.6, team: 'Europe' },
]

// Only 5 unique courses were played (Bay Harbor used for R2 and R3, different tees)
const COURSES = [
  { slug: 'crooked-tree', name: 'Crooked Tree', location: 'Petoskey, MI' },
  { slug: 'bay-harbor-links-quarry', name: 'Bay Harbor - Links/Quarry', location: 'Bay Harbor, MI' },
  { slug: 'donald-ross', name: 'Donald Ross Memorial', location: 'Boyne Highlands, MI' },
  { slug: 'the-heather', name: 'The Heather', location: 'Boyne Highlands, MI' },
  { slug: 'arthur-hills', name: 'Arthur Hills', location: 'Boyne Highlands, MI' },
]

// Tees: [courseSlug, teeName, teeColor, rating, slope] — real data from spreadsheet Course Data tab
const TEES: [string, string, string, number, number][] = [
  ['crooked-tree', 'Purple', '#800080', 71.4, 135],
  ['bay-harbor-links-quarry', 'Purple', '#800080', 72.1, 143],
  ['bay-harbor-links-quarry', 'Orange', '#FF8C00', 70.9, 142],
  ['donald-ross', 'Orange', '#FF8C00', 71.1, 136],
  ['the-heather', 'Orange', '#FF8C00', 70.3, 139],
  ['arthur-hills', 'Orange', '#FF8C00', 70.3, 132],
]

// Hole data per course/tee — [par[], yardage[], handicap[]]
// All from the Course Data tab of the spreadsheet
type HoleData = { par: number[]; yardage: number[]; handicap: number[] }
const HOLE_DATA: Record<string, HoleData> = {
  'crooked-tree|Purple': {
    par:      [4, 3, 4, 4, 3, 5, 4, 3, 5,  4, 3, 4, 5, 4, 3, 4, 5, 4],
    yardage:  [376, 166, 403, 388, 166, 532, 388, 160, 470,  431, 170, 405, 551, 377, 173, 376, 474, 390],
    handicap: [7, 11, 3, 1, 13, 9, 5, 15, 17,  8, 14, 2, 6, 12, 16, 10, 18, 4],
  },
  'bay-harbor-links-quarry|Purple': {
    par:      [4, 4, 4, 3, 4, 4, 5, 3, 5,  4, 3, 5, 4, 5, 4, 4, 3, 4],
    yardage:  [405, 420, 368, 151, 332, 388, 490, 206, 490,  355, 173, 523, 412, 468, 312, 392, 172, 370],
    handicap: [5, 9, 7, 17, 11, 1, 13, 15, 3,  14, 18, 6, 10, 2, 12, 4, 16, 8],
  },
  'bay-harbor-links-quarry|Orange': {
    par:      [4, 4, 4, 3, 4, 4, 5, 3, 5,  4, 3, 5, 4, 5, 4, 4, 3, 4],
    yardage:  [375, 383, 368, 151, 332, 352, 490, 175, 470,  355, 146, 523, 412, 468, 312, 366, 172, 358],
    handicap: [5, 9, 7, 17, 11, 1, 13, 15, 3,  14, 18, 6, 10, 2, 12, 4, 16, 8],
  },
  'donald-ross|Orange': {
    par:      [4, 4, 3, 4, 5, 4, 4, 3, 5,  4, 4, 3, 5, 4, 4, 5, 3, 4],
    yardage:  [351, 317, 174, 399, 561, 365, 311, 167, 467,  404, 309, 147, 458, 394, 384, 513, 167, 375],
    handicap: [11, 13, 5, 9, 1, 7, 17, 15, 3,  4, 16, 18, 2, 8, 10, 14, 12, 6],
  },
  'the-heather|Orange': {
    par:      [4, 4, 4, 3, 5, 3, 4, 4, 5,  4, 5, 3, 4, 4, 5, 3, 4, 4],
    yardage:  [342, 362, 341, 162, 467, 139, 353, 363, 521,  379, 496, 153, 385, 354, 466, 162, 346, 415],
    handicap: [15, 5, 13, 11, 1, 17, 7, 3, 9,  6, 18, 16, 8, 10, 2, 14, 12, 4],
  },
  'arthur-hills|Orange': {
    par:      [4, 4, 5, 4, 4, 5, 3, 4, 3,  4, 5, 4, 5, 3, 4, 3, 4, 5],
    yardage:  [355, 311, 494, 367, 417, 487, 136, 361, 166,  285, 531, 331, 516, 160, 401, 151, 385, 498],
    handicap: [9, 17, 5, 7, 1, 13, 15, 3, 11,  18, 4, 8, 14, 12, 2, 16, 6, 10],
  },
}

// Rounds: Bay Harbor used for both R2 (Purple) and R3 (Orange)
const ROUNDS: { number: number; name: string; format: MatchFormat; courseSlug: string; teeName: string }[] = [
  { number: 1, name: 'Thursday',    format: 'FOURBALL',  courseSlug: 'crooked-tree',           teeName: 'Purple' },
  { number: 2, name: 'Friday AM',   format: 'FOURBALL',  courseSlug: 'bay-harbor-links-quarry', teeName: 'Purple' },
  { number: 3, name: 'Friday PM',   format: 'FOURSOMES', courseSlug: 'bay-harbor-links-quarry', teeName: 'Orange' },
  { number: 4, name: 'Saturday AM', format: 'FOURBALL',  courseSlug: 'donald-ross',             teeName: 'Orange' },
  { number: 5, name: 'Saturday PM', format: 'SCRAMBLE',  courseSlug: 'the-heather',             teeName: 'Orange' },
  { number: 6, name: 'Sunday',      format: 'SINGLES',   courseSlug: 'arthur-hills',            teeName: 'Orange' },
]

// All 28 matches from the Michigan Open Scoreboard tab
// For 2v2 formats: side1 = [US player, US player], side2 = [EU player, EU player]
// For singles: side1 = [US player], side2 = [EU player]
type MatchData = {
  matchNumber: number
  side1: string[]
  side2: string[]
  side1Points: number
  side2Points: number
  resultText: string | null
}

const ALL_MATCHES: Record<number, MatchData[]> = {
  // Round 1 — Fourball, Crooked Tree (US 2.5, EU 1.5)
  1: [
    { matchNumber: 1, side1: ['Dylan Plachta', 'Joe Spencer'], side2: ['Maxwell Huntley', 'Eric Barkovich'], side1Points: 0.5, side2Points: 0.5, resultText: 'Halved' },
    { matchNumber: 2, side1: ['Alex Paxton', 'Ryan Hubona'], side2: ['Joey Ways Jr.', 'Kip Owen'], side1Points: 1, side2Points: 0, resultText: '1UP' },
    { matchNumber: 3, side1: ['Joey Aiello', 'Danny Morales'], side2: ['Ben Hammel', 'Tom Bostwick'], side1Points: 0, side2Points: 1, resultText: '2&1' },
    { matchNumber: 4, side1: ['Dave Meyer', 'Stephen Lear'], side2: ['Zach Lear', 'Zack Stitt'], side1Points: 1, side2Points: 0, resultText: '4&3' },
  ],
  // Round 2 — Fourball, Bay Harbor L/Q (US 1.5, EU 2.5)
  2: [
    { matchNumber: 1, side1: ['Stephen Lear', 'Dylan Plachta'], side2: ['Zach Lear', 'Tom Bostwick'], side1Points: 0, side2Points: 1, resultText: '2&0' },
    { matchNumber: 2, side1: ['Joey Aiello', 'Alex Paxton'], side2: ['Ben Hammel', 'Maxwell Huntley'], side1Points: 0.5, side2Points: 0.5, resultText: 'Halved' },
    { matchNumber: 3, side1: ['Danny Morales', 'Dave Meyer'], side2: ['Eric Barkovich', 'Kip Owen'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 4, side1: ['Ryan Hubona', 'Joe Spencer'], side2: ['Joey Ways Jr.', 'Zack Stitt'], side1Points: 0, side2Points: 1, resultText: null },
  ],
  // Round 3 — Foursomes (Mod. Alt Shot), Bay Harbor L/Q (US 2, EU 2)
  3: [
    { matchNumber: 1, side1: ['Joey Aiello', 'Stephen Lear'], side2: ['Ben Hammel', 'Zach Lear'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 2, side1: ['Dave Meyer', 'Dylan Plachta'], side2: ['Joey Ways Jr.', 'Eric Barkovich'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 3, side1: ['Alex Paxton', 'Joe Spencer'], side2: ['Tom Bostwick', 'Kip Owen'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 4, side1: ['Danny Morales', 'Ryan Hubona'], side2: ['Maxwell Huntley', 'Zack Stitt'], side1Points: 1, side2Points: 0, resultText: null },
  ],
  // Round 4 — Fourball, Donald Ross (US 3.5, EU 0.5)
  4: [
    { matchNumber: 1, side1: ['Stephen Lear', 'Alex Paxton'], side2: ['Tom Bostwick', 'Eric Barkovich'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 2, side1: ['Dylan Plachta', 'Ryan Hubona'], side2: ['Joey Ways Jr.', 'Zach Lear'], side1Points: 0.5, side2Points: 0.5, resultText: 'Halved' },
    { matchNumber: 3, side1: ['Danny Morales', 'Joe Spencer'], side2: ['Kip Owen', 'Zack Stitt'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 4, side1: ['Dave Meyer', 'Joey Aiello'], side2: ['Ben Hammel', 'Maxwell Huntley'], side1Points: 1, side2Points: 0, resultText: null },
  ],
  // Round 5 — 2-Man Scramble, The Heather (US 2.5, EU 1.5)
  5: [
    { matchNumber: 1, side1: ['Danny Morales', 'Stephen Lear'], side2: ['Ben Hammel', 'Kip Owen'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 2, side1: ['Dave Meyer', 'Alex Paxton'], side2: ['Joey Ways Jr.', 'Tom Bostwick'], side1Points: 0.5, side2Points: 0.5, resultText: 'Halved' },
    { matchNumber: 3, side1: ['Joe Spencer', 'Ryan Hubona'], side2: ['Zach Lear', 'Zack Stitt'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 4, side1: ['Joey Aiello', 'Dylan Plachta'], side2: ['Maxwell Huntley', 'Eric Barkovich'], side1Points: 1, side2Points: 0, resultText: null },
  ],
  // Round 6 — Singles, Arthur Hills (US 4, EU 4)
  6: [
    { matchNumber: 1, side1: ['Dylan Plachta'], side2: ['Maxwell Huntley'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 2, side1: ['Dave Meyer'], side2: ['Tom Bostwick'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 3, side1: ['Stephen Lear'], side2: ['Zach Lear'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 4, side1: ['Joe Spencer'], side2: ['Joey Ways Jr.'], side1Points: 0, side2Points: 1, resultText: null },
    { matchNumber: 5, side1: ['Alex Paxton'], side2: ['Kip Owen'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 6, side1: ['Joey Aiello'], side2: ['Zack Stitt'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 7, side1: ['Danny Morales'], side2: ['Eric Barkovich'], side1Points: 1, side2Points: 0, resultText: null },
    { matchNumber: 8, side1: ['Ryan Hubona'], side2: ['Ben Hammel'], side1Points: 0, side2Points: 1, resultText: null },
  ],
}

function calcCourseHandicap(index: number, slope: number): number {
  return Math.round(index * slope / 113)
}

async function main() {
  console.log('Seeding 2025 Michigan Open data...\n')

  // 1. Clear existing data (dependency order)
  console.log('Clearing existing data...')
  await prisma.score.deleteMany()
  await prisma.matchPlayer.deleteMany()
  await prisma.match.deleteMany()
  await prisma.sideGame.deleteMany()
  await prisma.wagerResult.deleteMany()
  await prisma.wagerConfig.deleteMany()
  await prisma.mVPConfig.deleteMany()
  await prisma.round.deleteMany()
  await prisma.hole.deleteMany()
  await prisma.tee.deleteMany()
  await prisma.tripCourse.deleteMany()
  await prisma.tripPlayer.deleteMany()
  await prisma.team.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Trip
  console.log('Creating trip...')
  const trip = await prisma.trip.create({
    data: {
      name: 'Michigan Open',
      year: 2025,
      startDate: new Date('2025-09-25'),
      endDate: new Date('2025-09-28'),
      location: 'Northern Michigan',
      description: 'Annual Ryder Cup style tournament',
      isTeamEvent: true,
      pointsToWin: 14,
    },
  })

  // 3. Create Teams
  console.log('Creating teams...')
  const usTeam = await prisma.team.create({
    data: { tripId: trip.id, name: 'US', color: '#002868', sortOrder: 0 },
  })
  const europeTeam = await prisma.team.create({
    data: { tripId: trip.id, name: 'Europe', color: '#003399', sortOrder: 1 },
  })
  const teamMap = { US: usTeam, Europe: europeTeam }

  // 4. Create Users + TripPlayers
  console.log('Creating 16 users and trip players...')
  const playerMap = new Map<string, { userId: string; tripPlayerId: string; handicap: number }>()

  for (const p of PLAYERS) {
    const user = await prisma.user.create({
      data: {
        supabaseId: `seed-${p.slug}`,
        email: `${p.slug}@seed.local`,
        name: p.name,
        handicapIndex: p.handicap,
      },
    })

    const team = teamMap[p.team as keyof typeof teamMap]
    const tripPlayer = await prisma.tripPlayer.create({
      data: {
        userId: user.id,
        tripId: trip.id,
        teamId: team.id,
        handicapAtTime: p.handicap,
        role: p.slug === 'stephen-lear' ? 'ORGANIZER' : 'PLAYER',
      },
    })

    playerMap.set(p.name, { userId: user.id, tripPlayerId: tripPlayer.id, handicap: p.handicap })
  }

  // 5. Create Courses
  console.log('Creating 5 courses...')
  const courseMap = new Map<string, string>()
  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: { name: c.name, location: c.location },
    })
    courseMap.set(c.slug, course.id)
  }

  // 6. Create TripCourse junction records
  for (const courseId of Array.from(courseMap.values())) {
    await prisma.tripCourse.create({
      data: { tripId: trip.id, courseId },
    })
  }

  // 7. Create Tees + Holes
  console.log('Creating tees and holes...')
  // Key: "courseSlug|teeName" -> teeId
  const teeMap = new Map<string, string>()

  for (const [courseSlug, teeName, teeColor, rating, slope] of TEES) {
    const courseId = courseMap.get(courseSlug)!
    const tee = await prisma.tee.create({
      data: { courseId, name: teeName, color: teeColor, rating, slope },
    })
    const key = `${courseSlug}|${teeName}`
    teeMap.set(key, tee.id)

    // Create holes for this tee if we have data
    const holeData = HOLE_DATA[key]
    if (holeData) {
      for (let h = 0; h < 18; h++) {
        await prisma.hole.create({
          data: {
            teeId: tee.id,
            number: h + 1,
            par: holeData.par[h],
            yardage: holeData.yardage[h],
            handicap: holeData.handicap[h],
          },
        })
      }
    }
  }

  // 8. Create Rounds
  console.log('Creating 6 rounds...')
  const roundMap = new Map<number, { id: string; slope: number }>()
  for (const r of ROUNDS) {
    const teeKey = `${r.courseSlug}|${r.teeName}`
    const teeId = teeMap.get(teeKey)!
    const teeInfo = TEES.find(t => t[0] === r.courseSlug && t[1] === r.teeName)!
    const slope = teeInfo[4]

    const round = await prisma.round.create({
      data: {
        tripId: trip.id,
        teeId,
        roundNumber: r.number,
        name: r.name,
        format: r.format,
        skinsEnabled: true,
        isComplete: true,
      },
    })
    roundMap.set(r.number, { id: round.id, slope })
  }

  // 9. Create Matches + MatchPlayers for ALL 6 rounds
  let totalMatches = 0
  let totalMatchPlayers = 0

  for (const [roundNum, matches] of Object.entries(ALL_MATCHES)) {
    const rn = parseInt(roundNum)
    const round = roundMap.get(rn)!
    console.log(`Creating Round ${rn} matches (${matches.length} matches)...`)

    for (const m of matches) {
      const match = await prisma.match.create({
        data: {
          roundId: round.id,
          matchNumber: m.matchNumber,
          status: 'COMPLETE',
          resultText: m.resultText,
          side1Points: m.side1Points,
          side2Points: m.side2Points,
        },
      })
      totalMatches++

      // Calculate course handicaps for all players in this match
      const allNames = [...m.side1, ...m.side2]
      const courseHandicaps = allNames.map((name) => {
        const p = playerMap.get(name)!
        return calcCourseHandicap(p.handicap, round.slope)
      })
      const lowestCH = Math.min(...courseHandicaps)

      for (let i = 0; i < allNames.length; i++) {
        const name = allNames[i]
        const tp = playerMap.get(name)!
        const ch = courseHandicaps[i]

        await prisma.matchPlayer.create({
          data: {
            matchId: match.id,
            tripPlayerId: tp.tripPlayerId,
            courseHandicap: ch,
            playingHandicap: ch - lowestCH,
            side: i < m.side1.length ? 1 : 2,
          },
        })
        totalMatchPlayers++
      }
    }
  }

  // Summary
  const counts = {
    trips: await prisma.trip.count(),
    teams: await prisma.team.count(),
    users: await prisma.user.count(),
    tripPlayers: await prisma.tripPlayer.count(),
    courses: await prisma.course.count(),
    tees: await prisma.tee.count(),
    holes: await prisma.hole.count(),
    rounds: await prisma.round.count(),
    matches: totalMatches,
    matchPlayers: totalMatchPlayers,
  }

  console.log('\nSeed complete! Record counts:')
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`)
  }
  console.log('\nFinal: US 16, Europe 12 — US WINS')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
