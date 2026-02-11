/**
 * Import 2025 Michigan Open scores from Excel spreadsheet into Prisma database.
 *
 * Reads "Pure Michigan Scorecards 2025 vF.xlsx" and upserts Score records
 * for all 6 rounds (R1-R6).
 *
 * Spreadsheet layout per round sheet ("ROUND 1" through "ROUND 6"):
 *   - Row 14 (0-indexed): column headers with "Name" at col 6, "Handicap" at col 7
 *   - Player score rows: name in col 6, handicap (number) in col 7, country in col 10
 *     Gross scores: holes 1-9 at cols 16-24, holes 10-18 at cols 27-35
 *   - For FOURSOMES (R3) and SCRAMBLE (R5): individual player rows have the team's
 *     gross scores; team rows (concatenated names) follow but are ignored.
 *   - Junk rows with name="1" are filtered out.
 *
 * Stroke allocation:
 *   - Player gets 1 stroke on holes where hole.handicap <= courseHandicap
 *   - If courseHandicap > 18: 2 strokes on holes where hole.handicap <= (courseHandicap - 18)
 *   - netScore = grossScore - strokesReceived
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================
// CONFIGURATION
// ============================================================

const XLSX_PATH = path.join(__dirname, '..', 'data', 'Pure Michigan Scorecards 2025 vF.xlsx');

// Columns in the spreadsheet (0-indexed)
const COL_NAME = 6;
const COL_HANDICAP = 7;
const COL_COUNTRY = 10;
const FRONT_9_START = 16; // col 16 = hole 1
const BACK_9_START = 27;  // col 27 = hole 10

// ============================================================
// HELPERS
// ============================================================

function getCellValue(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  return cell ? cell.v : null;
}

/**
 * Extract player gross scores from a ROUND sheet.
 * Returns array of { name, handicap, country, scores[18] }
 * Filters out junk rows and team rows (concatenated names without country).
 */
function extractPlayerScores(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const players = [];

  for (let row = 0; row <= range.e.r; row++) {
    const name = getCellValue(ws, row, COL_NAME);
    const handicap = getCellValue(ws, row, COL_HANDICAP);
    const country = getCellValue(ws, row, COL_COUNTRY);
    const hole1 = getCellValue(ws, row, FRONT_9_START);

    // Must have: string name, numeric handicap, numeric hole 1 score
    if (!name || typeof name !== 'string') continue;
    if (typeof handicap !== 'number') continue;
    if (typeof hole1 !== 'number') continue;

    // Filter junk rows (name="1")
    const trimmedName = name.trim();
    if (trimmedName === '1') continue;

    // Filter team/combination rows (no country value, or concatenated names)
    // Team rows have empty country field and contain multiple player names
    if (!country || (typeof country === 'string' && country.trim() === '')) continue;

    // Read 18 gross scores
    const scores = [];
    for (let h = 0; h < 9; h++) {
      const val = getCellValue(ws, row, FRONT_9_START + h);
      scores.push(typeof val === 'number' ? val : null);
    }
    for (let h = 0; h < 9; h++) {
      const val = getCellValue(ws, row, BACK_9_START + h);
      scores.push(typeof val === 'number' ? val : null);
    }

    // Verify we have all 18 scores
    if (scores.some(s => s === null)) {
      console.warn(`  WARNING: ${trimmedName} has missing scores at row ${row}: [${scores.join(',')}]`);
      continue;
    }

    players.push({
      name: trimmedName,
      handicap,
      country: typeof country === 'string' ? country.trim() : String(country).trim(),
      scores
    });
  }

  return players;
}

/**
 * Calculate strokes received on a hole.
 * @param {number} courseHandicap - Player's course handicap for this match
 * @param {number} holeHandicap - Hole's handicap index (1=hardest, 18=easiest)
 * @returns {number} 0, 1, or 2 strokes
 */
function calcStrokesReceived(courseHandicap, holeHandicap) {
  if (courseHandicap <= 0) return 0;
  let strokes = 0;
  if (holeHandicap <= courseHandicap) strokes++;
  if (courseHandicap > 18 && holeHandicap <= (courseHandicap - 18)) strokes++;
  return strokes;
}

/**
 * Normalize a player name for matching.
 * Handles minor differences between spreadsheet and DB.
 */
function normalizeName(name) {
  return name.trim().toLowerCase();
}

// ============================================================
// MAIN IMPORT LOGIC
// ============================================================

async function main() {
  console.log('=== 2025 Score Import ===\n');

  // 1. Load spreadsheet
  const wb = XLSX.readFile(XLSX_PATH);
  console.log('Loaded spreadsheet:', XLSX_PATH);

  // 2. Load 2025 trip with all nested data
  const trip = await prisma.trip.findFirst({
    where: { year: 2025 },
    include: {
      rounds: {
        include: {
          tee: {
            include: {
              holes: { orderBy: { number: 'asc' } }
            }
          },
          matches: {
            include: {
              players: {
                include: {
                  tripPlayer: {
                    include: {
                      user: { select: { name: true } }
                    }
                  }
                }
              }
            },
            orderBy: { matchNumber: 'asc' }
          }
        },
        orderBy: { roundNumber: 'asc' }
      },
      tripPlayers: {
        include: {
          user: { select: { name: true } }
        }
      }
    }
  });

  if (!trip) {
    throw new Error('2025 trip not found!');
  }

  console.log(`Found trip: ${trip.name} (${trip.year})`);
  console.log(`Rounds: ${trip.rounds.length}, Players: ${trip.tripPlayers.length}\n`);

  // Build a map of player name -> tripPlayerId (for the 2025 trip)
  // Handle the duplicate Stephen Lear — use the one that appears in matches
  const matchPlayerTripPlayerIds = new Set();
  for (const round of trip.rounds) {
    for (const match of round.matches) {
      for (const mp of match.players) {
        matchPlayerTripPlayerIds.add(mp.tripPlayerId);
      }
    }
  }

  const nameToTripPlayerId = {};
  for (const tp of trip.tripPlayers) {
    const name = tp.user.name;
    // For duplicates (Stephen Lear), prefer the one that's actually in matches
    if (nameToTripPlayerId[name]) {
      // Already have one - keep the one in matches
      if (matchPlayerTripPlayerIds.has(tp.id)) {
        nameToTripPlayerId[name] = tp.id;
      }
    } else {
      nameToTripPlayerId[name] = tp.id;
    }
  }

  console.log('Player name -> tripPlayerId mapping:');
  for (const [name, id] of Object.entries(nameToTripPlayerId)) {
    console.log(`  ${name} -> ${id}`);
  }
  console.log();

  let totalUpserted = 0;
  let totalSkipped = 0;

  // 3. Process each round
  for (const round of trip.rounds) {
    const roundNum = round.roundNumber;
    const sheetName = `ROUND ${roundNum}`;
    const ws = wb.Sheets[sheetName];

    if (!ws) {
      console.log(`Sheet "${sheetName}" not found, skipping.`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`ROUND ${roundNum}: ${round.name} - ${round.format}`);
    console.log(`${'='.repeat(60)}`);

    // Get hole data for this round's tee
    const holes = round.tee.holes; // sorted by number 1-18
    if (holes.length !== 18) {
      console.log(`  ERROR: Expected 18 holes, got ${holes.length}`);
      continue;
    }

    // Extract player scores from spreadsheet
    const sheetPlayers = extractPlayerScores(ws);
    console.log(`  Spreadsheet players found: ${sheetPlayers.length}`);
    sheetPlayers.forEach(p => console.log(`    ${p.name} (hcp=${p.handicap}, ${p.country})`));

    // Build a lookup: normalized name -> sheet player data
    const sheetPlayerMap = {};
    for (const sp of sheetPlayers) {
      sheetPlayerMap[normalizeName(sp.name)] = sp;
    }

    let roundUpserted = 0;

    // For FOURSOMES and SCRAMBLE, both players in a team pair share the same gross scores.
    // The spreadsheet has one "lead" player row per team with the gross scores.
    // We need to figure out the team pairings and assign the lead player's scores to both.

    const isTeamFormat = (round.format === 'FOURSOMES' || round.format === 'SCRAMBLE');

    for (const match of round.matches) {
      console.log(`\n  Match ${match.matchNumber}:`);

      // Group players by side
      const side1Players = match.players.filter(p => p.side === 1);
      const side2Players = match.players.filter(p => p.side === 2);

      if (isTeamFormat) {
        // For team formats, find the "lead" player (the one with scores in the spreadsheet)
        // and apply their gross scores to all players on the same side
        for (const [sideNum, sidePlayers] of [[1, side1Players], [2, side2Players]]) {
          // Find which player on this side has scores in the spreadsheet
          let leadSheetPlayer = null;
          for (const mp of sidePlayers) {
            const name = mp.tripPlayer.user.name;
            const sp = sheetPlayerMap[normalizeName(name)];
            if (sp) {
              leadSheetPlayer = sp;
              break;
            }
          }

          if (!leadSheetPlayer) {
            console.log(`    Side ${sideNum}: No matching spreadsheet player found!`);
            const sideNames = sidePlayers.map(p => p.tripPlayer.user.name).join(' & ');
            console.log(`      DB players: ${sideNames}`);
            totalSkipped += sidePlayers.length * 18;
            continue;
          }

          console.log(`    Side ${sideNum}: Using ${leadSheetPlayer.name}'s scores for team`);

          // Apply these gross scores to ALL players on this side
          for (const mp of sidePlayers) {
            const playerName = mp.tripPlayer.user.name;
            const courseHcp = mp.courseHandicap;

            for (let holeIdx = 0; holeIdx < 18; holeIdx++) {
              const hole = holes[holeIdx];
              const grossScore = leadSheetPlayer.scores[holeIdx];
              const strokesReceived = calcStrokesReceived(courseHcp, hole.handicap);
              const netScore = grossScore - strokesReceived;
              const strokeReceived = strokesReceived > 0;

              await prisma.score.upsert({
                where: {
                  matchPlayerId_holeId: {
                    matchPlayerId: mp.id,
                    holeId: hole.id
                  }
                },
                update: {
                  grossScore,
                  netScore,
                  strokeReceived
                },
                create: {
                  matchPlayerId: mp.id,
                  tripPlayerId: mp.tripPlayerId,
                  holeId: hole.id,
                  grossScore,
                  netScore,
                  strokeReceived
                }
              });
              roundUpserted++;
            }
            console.log(`      ${playerName}: 18 scores upserted (courseHcp=${courseHcp})`);
          }
        }
      } else {
        // FOURBALL or SINGLES: each player has their own scores
        for (const mp of match.players) {
          const playerName = mp.tripPlayer.user.name;
          const courseHcp = mp.courseHandicap;
          const sp = sheetPlayerMap[normalizeName(playerName)];

          if (!sp) {
            console.log(`    ${playerName}: NOT FOUND in spreadsheet, skipping`);
            totalSkipped += 18;
            continue;
          }

          for (let holeIdx = 0; holeIdx < 18; holeIdx++) {
            const hole = holes[holeIdx];
            const grossScore = sp.scores[holeIdx];
            const strokesReceived = calcStrokesReceived(courseHcp, hole.handicap);
            const netScore = grossScore - strokesReceived;
            const strokeReceived = strokesReceived > 0;

            await prisma.score.upsert({
              where: {
                matchPlayerId_holeId: {
                  matchPlayerId: mp.id,
                  holeId: hole.id
                }
              },
              update: {
                grossScore,
                netScore,
                strokeReceived
              },
              create: {
                matchPlayerId: mp.id,
                tripPlayerId: mp.tripPlayerId,
                holeId: hole.id,
                grossScore,
                netScore,
                strokeReceived
              }
            });
            roundUpserted++;
          }
          console.log(`    ${playerName}: 18 scores upserted (courseHcp=${courseHcp}, gross=[${sp.scores.join(',')}])`);
        }
      }
    }

    console.log(`\n  Round ${roundNum} total: ${roundUpserted} scores upserted`);
    totalUpserted += roundUpserted;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`IMPORT COMPLETE`);
  console.log(`  Total scores upserted: ${totalUpserted}`);
  console.log(`  Total scores skipped: ${totalSkipped}`);

  // Final count
  const finalCount = await prisma.score.count();
  console.log(`  Total scores in DB: ${finalCount}`);
  console.log(`${'='.repeat(60)}`);
}

main()
  .catch(err => {
    console.error('IMPORT FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
