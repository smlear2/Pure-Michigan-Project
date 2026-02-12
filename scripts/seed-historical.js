/**
 * Seed historical Michigan Open data (2023 or 2024) from Excel spreadsheets.
 *
 * Usage: node scripts/seed-historical.js 2023
 *        node scripts/seed-historical.js 2024
 *
 * Creates: Trip, Teams, Users, TripPlayers, Courses/Tees/Holes (if missing),
 *          Rounds, Matches, MatchPlayers, Scores.
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================
// SPREADSHEET COLUMN LAYOUT (same as 2025)
// ============================================================
const COL_NAME = 6;
const COL_HANDICAP = 7;
const COL_COUNTRY = 10;
const FRONT_9_START = 16;
const BACK_9_START = 27;

// ============================================================
// NAME ALIASES: Excel name → DB name
// ============================================================
const NAME_ALIASES = {
  'Steve Myers': 'Stove Myers',
  'Joey Ways Jr.': 'Joe Ways',
  'Zach Stitt': 'Zack Stitt',
  'Max Huntley': 'Maxwell Huntley',
};

function resolveDbName(excelName) {
  return NAME_ALIASES[excelName] || excelName;
}

// ============================================================
// YEAR CONFIGS
// ============================================================

const YEAR_CONFIGS = {
  2023: {
    file: 'Pure Michigan Scorecards 2023 vF.xlsm',
    tripName: 'Michigan Open',
    startDate: '2023-06-22',
    endDate: '2023-06-25',
    handicapConfig: {
      percentage: 80,
      offTheLow: true,
      teamCombos: {
        FOURSOMES: { lowPct: 60, highPct: 40 },
        SCRAMBLE: { lowPct: 35, highPct: 15 },
      },
    },
    players: [
      // Europe
      { name: 'Dylan Plachta', team: 'Europe', index: 11.1, tilt: true, skins: true },
      { name: 'Ben Hammel', team: 'Europe', index: 4.4, tilt: true, skins: true },
      { name: 'Joey Ways Jr.', team: 'Europe', index: 7.1, tilt: true, skins: true },
      { name: 'Eric Barkovich', team: 'Europe', index: 13.6, tilt: true, skins: true },
      { name: 'Steve Myers', team: 'Europe', index: 8.1, tilt: true, skins: true },
      { name: 'Maxwell Huntley', team: 'Europe', index: 9.9, tilt: false, skins: true },
      { name: 'Ryan Hubona', team: 'Europe', index: 22.4, tilt: false, skins: true },
      { name: 'Zach Stitt', team: 'Europe', index: 27.4, tilt: true, skins: true },
      // US
      { name: 'Stephen Lear', team: 'US', index: 6.4, tilt: true, skins: true },
      { name: 'Zach Lear', team: 'US', index: 5.2, tilt: true, skins: true },
      { name: 'Danny Morales', team: 'US', index: 5.2, tilt: true, skins: true },
      { name: 'Tom Bostwick', team: 'US', index: 13.4, tilt: true, skins: true },
      { name: 'Joey Aiello', team: 'US', index: 8, tilt: true, skins: true },
      { name: 'Dave Meyer', team: 'US', index: 3, tilt: true, skins: true },
      { name: 'Joe Spencer', team: 'US', index: 21.1, tilt: true, skins: true },
      { name: 'Kip Owen', team: 'US', index: 14, tilt: true, skins: false },
    ],
    rounds: [
      { num: 1, course: 'Crooked Tree', tee: 'Purple', format: 'FOURBALL', skins: true, tilt: true },
      { num: 2, course: 'Bay Harbor - Links/Quarry', tee: 'Orange', format: 'FOURBALL', skins: true, tilt: true },
      { num: 3, course: 'Bay Harbor - Links/Quarry', tee: 'Orange', format: 'FOURBALL', skins: true, tilt: true },
      { num: 4, course: 'The Heather', tee: 'Orange', format: 'FOURSOMES', skins: false, tilt: false },
      { num: 5, course: 'The Moor', tee: 'Orange', format: 'SCRAMBLE', skins: true, tilt: false },
      { num: 6, course: 'Arthur Hills', tee: 'Orange', format: 'SINGLES', skins: true, tilt: true },
    ],
    // Matches from Michigan Open Scoreboard sheet
    // For fourball/foursomes/scramble: 4 matches with 2v2
    // For singles: 8 matches with 1v1
    matches: [
      // R1 Fourball
      { round: 1, num: 1, side1: ['Steve Myers', 'Ryan Hubona'], side2: ['Tom Bostwick', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 1, num: 2, side1: ['Joey Ways Jr.', 'Maxwell Huntley'], side2: ['Dave Meyer', 'Joey Aiello'], s1Pts: 0, s2Pts: 1 },
      { round: 1, num: 3, side1: ['Ben Hammel', 'Zach Stitt'], side2: ['Stephen Lear', 'Kip Owen'], s1Pts: 0, s2Pts: 1 },
      { round: 1, num: 4, side1: ['Dylan Plachta', 'Eric Barkovich'], side2: ['Zach Lear', 'Danny Morales'], s1Pts: 0, s2Pts: 1 },
      // R2 Fourball
      { round: 2, num: 1, side1: ['Joey Ways Jr.', 'Dylan Plachta'], side2: ['Stephen Lear', 'Tom Bostwick'], s1Pts: 1, s2Pts: 0 },
      { round: 2, num: 2, side1: ['Ben Hammel', 'Steve Myers'], side2: ['Dave Meyer', 'Danny Morales'], s1Pts: 1, s2Pts: 0 },
      { round: 2, num: 3, side1: ['Eric Barkovich', 'Zach Stitt'], side2: ['Joey Aiello', 'Joe Spencer'], s1Pts: 0, s2Pts: 1 },
      { round: 2, num: 4, side1: ['Maxwell Huntley', 'Ryan Hubona'], side2: ['Zach Lear', 'Kip Owen'], s1Pts: 0.5, s2Pts: 0.5 },
      // R3 Fourball
      { round: 3, num: 1, side1: ['Ben Hammel', 'Joey Ways Jr.'], side2: ['Zach Lear', 'Tom Bostwick'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 3, num: 2, side1: ['Maxwell Huntley', 'Eric Barkovich'], side2: ['Dave Meyer', 'Stephen Lear'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 3, num: 3, side1: ['Dylan Plachta', 'Steve Myers'], side2: ['Danny Morales', 'Joey Aiello'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 3, num: 4, side1: ['Ryan Hubona', 'Zach Stitt'], side2: ['Kip Owen', 'Joe Spencer'], s1Pts: 0, s2Pts: 1 },
      // R4 Foursomes
      { round: 4, num: 1, side1: ['Ben Hammel', 'Maxwell Huntley'], side2: ['Stephen Lear', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 4, num: 2, side1: ['Joey Ways Jr.', 'Ryan Hubona'], side2: ['Zach Lear', 'Joey Aiello'], s1Pts: 0, s2Pts: 1 },
      { round: 4, num: 3, side1: ['Dylan Plachta', 'Zach Stitt'], side2: ['Dave Meyer', 'Kip Owen'], s1Pts: 0, s2Pts: 1 },
      { round: 4, num: 4, side1: ['Steve Myers', 'Eric Barkovich'], side2: ['Danny Morales', 'Tom Bostwick'], s1Pts: 0.5, s2Pts: 0.5 },
      // R5 Scramble
      { round: 5, num: 1, side1: ['Dylan Plachta', 'Eric Barkovich'], side2: ['Joey Aiello', 'Tom Bostwick'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 5, num: 2, side1: ['Ben Hammel', 'Zach Stitt'], side2: ['Zach Lear', 'Stephen Lear'], s1Pts: 0, s2Pts: 1 },
      { round: 5, num: 3, side1: ['Steve Myers', 'Ryan Hubona'], side2: ['Danny Morales', 'Kip Owen'], s1Pts: 0, s2Pts: 1 },
      { round: 5, num: 4, side1: ['Joey Ways Jr.', 'Maxwell Huntley'], side2: ['Dave Meyer', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      // R6 Singles
      { round: 6, num: 1, side1: ['Maxwell Huntley'], side2: ['Joey Aiello'], s1Pts: 0, s2Pts: 1 },
      { round: 6, num: 2, side1: ['Zach Stitt'], side2: ['Kip Owen'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 3, side1: ['Eric Barkovich'], side2: ['Danny Morales'], s1Pts: 0, s2Pts: 1 },
      { round: 6, num: 4, side1: ['Ryan Hubona'], side2: ['Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 5, side1: ['Ben Hammel'], side2: ['Dave Meyer'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 6, side1: ['Steve Myers'], side2: ['Zach Lear'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 6, num: 7, side1: ['Joey Ways Jr.'], side2: ['Stephen Lear'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 8, side1: ['Dylan Plachta'], side2: ['Tom Bostwick'], s1Pts: 1, s2Pts: 0 },
    ],
  },
  2024: {
    file: 'Pure Michigan Scorecards 2024 vF.xlsm',
    tripName: 'Michigan Open',
    startDate: '2024-06-20',
    endDate: '2024-06-23',
    handicapConfig: {
      percentage: 80,
      offTheLow: true,
      teamCombos: {
        FOURSOMES: { lowPct: 60, highPct: 40 },
        SCRAMBLE: { lowPct: 35, highPct: 15 },
      },
    },
    players: [
      // Europe
      { name: 'Dylan Plachta', team: 'Europe', index: 10.3, tilt: true, skins: true },
      { name: 'Ben Hammel', team: 'Europe', index: 4.8, tilt: true, skins: true },
      { name: 'Max Huntley', team: 'Europe', index: 10, tilt: false, skins: true },
      { name: 'Joey Ways Jr.', team: 'Europe', index: 7.4, tilt: true, skins: true },
      { name: 'Tom Bostwick', team: 'Europe', index: 13.7, tilt: true, skins: true },
      { name: 'Alex Paxton', team: 'Europe', index: 8.1, tilt: true, skins: true },
      { name: 'Joe Spencer', team: 'Europe', index: 20.8, tilt: true, skins: true },
      { name: 'Kevin Shepp', team: 'Europe', index: 23.8, tilt: false, skins: true },
      // US
      { name: 'Stephen Lear', team: 'US', index: 8.1, tilt: true, skins: true },
      { name: 'Joey Aiello', team: 'US', index: 4.2, tilt: true, skins: true },
      { name: 'Zach Lear', team: 'US', index: 5.2, tilt: true, skins: true },
      { name: 'Danny Morales', team: 'US', index: 4.9, tilt: true, skins: true },
      { name: 'Stove Myers', team: 'US', index: 11, tilt: true, skins: true },
      { name: 'Zack Stitt', team: 'US', index: 23.6, tilt: false, skins: true },
      { name: 'Kip Owen', team: 'US', index: 19.9, tilt: false, skins: true },
      { name: 'Ryan Hubona', team: 'US', index: 20.1, tilt: false, skins: false },
    ],
    rounds: [
      { num: 1, course: 'Crooked Tree', tee: 'Purple', format: 'FOURBALL', skins: true, tilt: true },
      { num: 2, course: 'Bay Harbor - Links/Quarry', tee: 'Orange', format: 'FOURBALL', skins: true, tilt: true },
      { num: 3, course: 'Bay Harbor - Links/Quarry', tee: 'Blue', format: 'FOURSOMES', skins: true, tilt: false },
      { num: 4, course: 'Donald Ross Memorial', tee: 'Purple', format: 'FOURBALL', skins: true, tilt: true },
      { num: 5, course: 'The Heather', tee: 'Orange', format: 'SCRAMBLE', skins: true, tilt: false },
      { num: 6, course: 'Arthur Hills', tee: 'Orange', format: 'SINGLES', skins: true, tilt: true },
    ],
    matches: [
      // R1 Fourball
      { round: 1, num: 1, side1: ['Zach Lear', 'Zack Stitt'], side2: ['Joey Ways Jr.', 'Alex Paxton'], s1Pts: 0, s2Pts: 1 },
      { round: 1, num: 2, side1: ['Stove Myers', 'Kip Owen'], side2: ['Tom Bostwick', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 1, num: 3, side1: ['Stephen Lear', 'Ryan Hubona'], side2: ['Dylan Plachta', 'Max Huntley'], s1Pts: 1, s2Pts: 0 },
      { round: 1, num: 4, side1: ['Danny Morales', 'Joey Aiello'], side2: ['Ben Hammel', 'Kevin Shepp'], s1Pts: 1, s2Pts: 0 },
      // R2 Fourball
      { round: 2, num: 1, side1: ['Danny Morales', 'Stephen Lear'], side2: ['Dylan Plachta', 'Tom Bostwick'], s1Pts: 0, s2Pts: 1 },
      { round: 2, num: 2, side1: ['Joey Aiello', 'Zack Stitt'], side2: ['Ben Hammel', 'Max Huntley'], s1Pts: 0, s2Pts: 1 },
      { round: 2, num: 3, side1: ['Stove Myers', 'Ryan Hubona'], side2: ['Alex Paxton', 'Kevin Shepp'], s1Pts: 0, s2Pts: 1 },
      { round: 2, num: 4, side1: ['Zach Lear', 'Kip Owen'], side2: ['Joey Ways Jr.', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      // R3 Foursomes
      { round: 3, num: 1, side1: ['Stephen Lear', 'Zack Stitt'], side2: ['Max Huntley', 'Tom Bostwick'], s1Pts: 1, s2Pts: 0 },
      { round: 3, num: 2, side1: ['Danny Morales', 'Stove Myers'], side2: ['Ben Hammel', 'Alex Paxton'], s1Pts: 1, s2Pts: 0 },
      { round: 3, num: 3, side1: ['Joey Aiello', 'Zach Lear'], side2: ['Dylan Plachta', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 3, num: 4, side1: ['Kip Owen', 'Ryan Hubona'], side2: ['Joey Ways Jr.', 'Kevin Shepp'], s1Pts: 0, s2Pts: 1 },
      // R4 Fourball
      { round: 4, num: 1, side1: ['Zack Stitt', 'Kip Owen'], side2: ['Joe Spencer', 'Kevin Shepp'], s1Pts: 1, s2Pts: 0 },
      { round: 4, num: 2, side1: ['Danny Morales', 'Zach Lear'], side2: ['Ben Hammel', 'Max Huntley'], s1Pts: 0, s2Pts: 1 },
      { round: 4, num: 3, side1: ['Stephen Lear', 'Joey Aiello'], side2: ['Joey Ways Jr.', 'Alex Paxton'], s1Pts: 1, s2Pts: 0 },
      { round: 4, num: 4, side1: ['Stove Myers', 'Ryan Hubona'], side2: ['Dylan Plachta', 'Tom Bostwick'], s1Pts: 0, s2Pts: 1 },
      // R5 Scramble
      { round: 5, num: 1, side1: ['Stephen Lear', 'Zach Lear'], side2: ['Ben Hammel', 'Alex Paxton'], s1Pts: 1, s2Pts: 0 },
      { round: 5, num: 2, side1: ['Danny Morales', 'Ryan Hubona'], side2: ['Max Huntley', 'Joe Spencer'], s1Pts: 1, s2Pts: 0 },
      { round: 5, num: 3, side1: ['Joey Aiello', 'Kip Owen'], side2: ['Joey Ways Jr.', 'Tom Bostwick'], s1Pts: 1, s2Pts: 0 },
      { round: 5, num: 4, side1: ['Stove Myers', 'Zack Stitt'], side2: ['Dylan Plachta', 'Kevin Shepp'], s1Pts: 0, s2Pts: 1 },
      // R6 Singles
      { round: 6, num: 1, side1: ['Stephen Lear'], side2: ['Joey Ways Jr.'], s1Pts: 0, s2Pts: 1 },
      { round: 6, num: 2, side1: ['Stove Myers'], side2: ['Alex Paxton'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 3, side1: ['Zach Lear'], side2: ['Max Huntley'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 4, side1: ['Danny Morales'], side2: ['Tom Bostwick'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 5, side1: ['Kip Owen'], side2: ['Kevin Shepp'], s1Pts: 1, s2Pts: 0 },
      { round: 6, num: 6, side1: ['Zack Stitt'], side2: ['Joe Spencer'], s1Pts: 0, s2Pts: 1 },
      { round: 6, num: 7, side1: ['Joey Aiello'], side2: ['Ben Hammel'], s1Pts: 0.5, s2Pts: 0.5 },
      { round: 6, num: 8, side1: ['Ryan Hubona'], side2: ['Dylan Plachta'], s1Pts: 0.5, s2Pts: 0.5 },
    ],
  },
};

// ============================================================
// MISSING COURSE/TEE DATA
// Hole data: [par, handicap, yardage] for holes 1-18
// ============================================================
const MISSING_TEES = {
  'The Moor||Orange': {
    courseName: 'The Moor',
    teeName: 'Orange',
    rating: 70.7,
    slope: 133,
    color: '#FFA500',
    holes: [
      { number: 1, par: 4, handicap: 5, yardage: 337 },
      { number: 2, par: 4, handicap: 15, yardage: 335 },
      { number: 3, par: 5, handicap: 17, yardage: 473 },
      { number: 4, par: 3, handicap: 9, yardage: 189 },
      { number: 5, par: 4, handicap: 1, yardage: 402 },
      { number: 6, par: 3, handicap: 7, yardage: 174 },
      { number: 7, par: 4, handicap: 11, yardage: 333 },
      { number: 8, par: 5, handicap: 13, yardage: 476 },
      { number: 9, par: 4, handicap: 3, yardage: 387 },
      { number: 10, par: 4, handicap: 4, yardage: 383 },
      { number: 11, par: 3, handicap: 14, yardage: 161 },
      { number: 12, par: 4, handicap: 10, yardage: 328 },
      { number: 13, par: 4, handicap: 8, yardage: 378 },
      { number: 14, par: 5, handicap: 18, yardage: 503 },
      { number: 15, par: 4, handicap: 2, yardage: 374 },
      { number: 16, par: 4, handicap: 6, yardage: 356 },
      { number: 17, par: 3, handicap: 16, yardage: 145 },
      { number: 18, par: 5, handicap: 12, yardage: 502 },
    ],
  },
  'Donald Ross Memorial||Purple': {
    courseName: 'Donald Ross Memorial',
    teeName: 'Purple',
    rating: 72.3,
    slope: 140,
    color: '#800080',
    holes: [
      { number: 1, par: 4, handicap: 11, yardage: 364 },
      { number: 2, par: 4, handicap: 13, yardage: 326 },
      { number: 3, par: 3, handicap: 5, yardage: 185 },
      { number: 4, par: 4, handicap: 9, yardage: 422 },
      { number: 5, par: 5, handicap: 1, yardage: 593 },
      { number: 6, par: 4, handicap: 7, yardage: 376 },
      { number: 7, par: 4, handicap: 17, yardage: 328 },
      { number: 8, par: 3, handicap: 15, yardage: 181 },
      { number: 9, par: 5, handicap: 3, yardage: 484 },
      { number: 10, par: 4, handicap: 14, yardage: 330 },
      { number: 11, par: 3, handicap: 16, yardage: 159 },
      { number: 12, par: 3, handicap: 18, yardage: 159 },
      { number: 13, par: 5, handicap: 2, yardage: 502 },
      { number: 14, par: 4, handicap: 6, yardage: 410 },
      { number: 15, par: 4, handicap: 8, yardage: 400 },
      { number: 16, par: 5, handicap: 12, yardage: 533 },
      { number: 17, par: 3, handicap: 10, yardage: 184 },
      { number: 18, par: 4, handicap: 4, yardage: 407 },
    ],
  },
  'Bay Harbor - Links/Quarry||Blue': {
    courseName: 'Bay Harbor - Links/Quarry',
    teeName: 'Blue',
    rating: 69.8,
    slope: 140,
    color: '#0000FF',
    holes: [
      { number: 1, par: 4, handicap: 5, yardage: 375 },
      { number: 2, par: 4, handicap: 9, yardage: 383 },
      { number: 3, par: 4, handicap: 7, yardage: 346 },
      { number: 4, par: 3, handicap: 17, yardage: 127 },
      { number: 5, par: 4, handicap: 11, yardage: 319 },
      { number: 6, par: 4, handicap: 1, yardage: 352 },
      { number: 7, par: 5, handicap: 13, yardage: 482 },
      { number: 8, par: 3, handicap: 15, yardage: 175 },
      { number: 9, par: 5, handicap: 3, yardage: 456 },
      { number: 10, par: 4, handicap: 14, yardage: 311 },
      { number: 11, par: 3, handicap: 18, yardage: 146 },
      { number: 12, par: 5, handicap: 6, yardage: 498 },
      { number: 13, par: 4, handicap: 10, yardage: 372 },
      { number: 14, par: 5, handicap: 2, yardage: 446 },
      { number: 15, par: 4, handicap: 12, yardage: 300 },
      { number: 16, par: 4, handicap: 4, yardage: 366 },
      { number: 17, par: 3, handicap: 16, yardage: 139 },
      { number: 18, par: 4, handicap: 8, yardage: 358 },
    ],
  },
};

// ============================================================
// HELPERS
// ============================================================

function getCellValue(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  return cell ? cell.v : null;
}

function extractPlayerScores(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const players = [];

  for (let row = 0; row <= range.e.r; row++) {
    const name = getCellValue(ws, row, COL_NAME);
    const handicap = getCellValue(ws, row, COL_HANDICAP);
    const country = getCellValue(ws, row, COL_COUNTRY);
    const hole1 = getCellValue(ws, row, FRONT_9_START);

    if (!name || typeof name !== 'string') continue;
    if (typeof handicap !== 'number') continue;
    if (typeof hole1 !== 'number') continue;

    const trimmedName = name.trim();
    if (trimmedName === '1') continue;
    if (!country || (typeof country === 'string' && country.trim() === '')) continue;

    const scores = [];
    for (let h = 0; h < 9; h++) {
      const val = getCellValue(ws, row, FRONT_9_START + h);
      scores.push(typeof val === 'number' ? val : null);
    }
    for (let h = 0; h < 9; h++) {
      const val = getCellValue(ws, row, BACK_9_START + h);
      scores.push(typeof val === 'number' ? val : null);
    }

    const validCount = scores.filter(s => s !== null).length;
    if (validCount === 0) {
      console.warn(`  WARNING: ${trimmedName} has NO scores at row ${row}, skipping`);
      continue;
    }
    if (validCount < 18) {
      console.warn(`  NOTE: ${trimmedName} has ${validCount}/18 scores at row ${row} (partial)`);
    }

    players.push({ name: trimmedName, handicap, country: String(country).trim(), scores });
  }

  return players;
}

function calcStrokesReceived(courseHandicap, holeHandicap) {
  if (courseHandicap <= 0) return 0;
  let strokes = 0;
  if (holeHandicap <= courseHandicap) strokes++;
  if (courseHandicap > 18 && holeHandicap <= (courseHandicap - 18)) strokes++;
  return strokes;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function computeResultText(s1Pts, s2Pts) {
  if (s1Pts === s2Pts) return 'Halved';
  const winner = s1Pts > s2Pts ? 1 : 2;
  const diff = Math.abs(s1Pts - s2Pts);
  return `Side ${winner} wins ${diff}`;
}

// Handicap calculation helpers (inline since we can't import TS)
function courseHandicap(index, slope) {
  return Math.round(index * slope / 113);
}

function adjustedHandicap(courseHdcp, percentage) {
  return Math.ceil(courseHdcp * percentage / 100);
}

function teamHandicap(adjustedHdcps, lowPct, highPct) {
  const sorted = [...adjustedHdcps].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return Math.round(sorted[0] * lowPct / 100);
  return Math.round(sorted[0] * lowPct / 100 + sorted[1] * highPct / 100);
}

function computePlayingHandicaps(matchPlayers, format, config) {
  // matchPlayers: [{ name, courseHdcp, side }]
  const pct = config.percentage;
  const teamCombo = config.teamCombos?.[format];
  const isTeamFormat = !!teamCombo;

  if (isTeamFormat) {
    // Group by side
    const sides = {};
    for (const mp of matchPlayers) {
      if (!sides[mp.side]) sides[mp.side] = [];
      sides[mp.side].push(mp);
    }

    // Compute adjusted handicaps
    for (const mp of matchPlayers) {
      mp.adjustedHdcp = adjustedHandicap(mp.courseHdcp, pct);
    }

    // Compute team handicaps
    const teamHdcps = {};
    for (const [side, players] of Object.entries(sides)) {
      const hdcps = players.map(p => p.adjustedHdcp);
      teamHdcps[side] = teamHandicap(hdcps, teamCombo.lowPct, teamCombo.highPct);
    }

    // Off the low (team level)
    const lowestTeam = Math.min(...Object.values(teamHdcps));
    for (const mp of matchPlayers) {
      mp.playingHandicap = Math.max(0, teamHdcps[mp.side] - lowestTeam);
    }
  } else {
    // Individual format
    for (const mp of matchPlayers) {
      mp.adjustedHdcp = adjustedHandicap(mp.courseHdcp, pct);
    }

    const lowest = Math.min(...matchPlayers.map(p => p.adjustedHdcp));
    for (const mp of matchPlayers) {
      mp.playingHandicap = Math.max(0, mp.adjustedHdcp - lowest);
    }
  }

  return matchPlayers;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const yearArg = parseInt(process.argv[2]);
  if (!YEAR_CONFIGS[yearArg]) {
    console.error('Usage: node scripts/seed-historical.js <2023|2024>');
    process.exit(1);
  }

  const config = YEAR_CONFIGS[yearArg];
  console.log(`\n=== Seeding ${yearArg} Michigan Open ===\n`);

  // Check if trip already exists
  const existingTrip = await prisma.trip.findFirst({ where: { year: yearArg, name: { contains: 'Michigan' } } });
  if (existingTrip) {
    console.error(`Trip already exists for ${yearArg}: ${existingTrip.name} (${existingTrip.id})`);
    console.error('Delete it first if you want to re-seed.');
    process.exit(1);
  }

  // Load spreadsheet
  const xlsxPath = path.join(__dirname, '..', 'data', config.file);
  const wb = XLSX.readFile(xlsxPath);
  console.log(`Loaded: ${config.file}`);

  // ---- Step 1: Find/create Users ----
  console.log('\n--- Step 1: Users ---');
  const userMap = {}; // excelName -> userId
  for (const player of config.players) {
    const dbName = resolveDbName(player.name);
    // Try to find existing user by name (case-insensitive)
    let user = await prisma.user.findFirst({
      where: { name: { equals: dbName, mode: 'insensitive' } },
    });

    if (!user) {
      // Also try the original Excel name
      user = await prisma.user.findFirst({
        where: { name: { equals: player.name, mode: 'insensitive' } },
      });
    }

    if (user) {
      console.log(`  Found: ${player.name} -> ${user.name} (${user.id})`);
    } else {
      const slug = slugify(dbName);
      user = await prisma.user.create({
        data: {
          supabaseId: `pending-${slug}-${yearArg}`,
          email: `${slug}@seed.local`,
          name: dbName,
          handicapIndex: player.index,
        },
      });
      console.log(`  Created: ${dbName} (${user.id})`);
    }
    userMap[player.name] = user.id;
  }

  // ---- Step 2: Create Trip ----
  console.log('\n--- Step 2: Trip ---');
  const trip = await prisma.trip.create({
    data: {
      name: config.tripName,
      year: yearArg,
      startDate: new Date(config.startDate),
      endDate: new Date(config.endDate),
      location: 'Petoskey, Michigan',
      isTeamEvent: true,
      pointsForWin: 1,
      pointsForHalf: 0.5,
      handicapConfig: config.handicapConfig,
      defaultSkinsEntryFee: 20,
      defaultSkinsCarryover: false,
      defaultTiltEntryFee: 50,
      defaultTiltCarryover: false,
    },
  });
  console.log(`  Created trip: ${trip.name} ${trip.year} (${trip.id})`);

  // ---- Step 3: Create Teams ----
  console.log('\n--- Step 3: Teams ---');
  const usTeam = await prisma.team.create({
    data: { tripId: trip.id, name: 'USA', color: '#BF0A30', sortOrder: 0 },
  });
  const euTeam = await prisma.team.create({
    data: { tripId: trip.id, name: 'Europe', color: '#002868', sortOrder: 1 },
  });
  console.log(`  US team: ${usTeam.id}`);
  console.log(`  Europe team: ${euTeam.id}`);

  // ---- Step 4: Create TripPlayers ----
  console.log('\n--- Step 4: TripPlayers ---');
  const tripPlayerMap = {}; // excelName -> tripPlayerId
  for (const player of config.players) {
    const teamId = player.team === 'US' ? usTeam.id : euTeam.id;
    const userId = userMap[player.name];
    const tp = await prisma.tripPlayer.create({
      data: {
        userId,
        tripId: trip.id,
        teamId,
        handicapAtTime: player.index,
        skinsOptIn: player.skins,
        tiltOptIn: player.tilt,
        role: 'PLAYER',
      },
    });
    tripPlayerMap[player.name] = tp.id;
    console.log(`  ${player.name} -> ${tp.id} (${player.team}, idx=${player.index})`);
  }

  // ---- Step 5: Find/create Courses + Tees + Holes ----
  console.log('\n--- Step 5: Courses & Tees ---');
  const teeMap = {}; // "courseName||teeName" -> teeId

  for (const round of config.rounds) {
    const key = `${round.course}||${round.tee}`;
    if (teeMap[key]) continue; // already resolved

    // Find course
    let course = await prisma.course.findFirst({
      where: { name: { equals: round.course, mode: 'insensitive' } },
    });

    if (!course) {
      // Create new course (e.g., The Moor)
      const missingData = MISSING_TEES[key];
      if (!missingData) {
        console.error(`  ERROR: Course "${round.course}" not found and no data to create it!`);
        process.exit(1);
      }
      course = await prisma.course.create({
        data: { name: missingData.courseName, location: 'Petoskey, Michigan' },
      });
      console.log(`  Created course: ${course.name} (${course.id})`);
    }

    // Find tee on this course
    let tee = await prisma.tee.findFirst({
      where: { courseId: course.id, name: { equals: round.tee, mode: 'insensitive' } },
    });

    if (!tee) {
      const missingData = MISSING_TEES[key];
      if (!missingData) {
        console.error(`  ERROR: Tee "${round.tee}" on "${round.course}" not found and no data!`);
        process.exit(1);
      }
      tee = await prisma.tee.create({
        data: {
          courseId: course.id,
          name: missingData.teeName,
          color: missingData.color,
          rating: missingData.rating,
          slope: missingData.slope,
          holes: {
            create: missingData.holes.map(h => ({
              number: h.number,
              par: h.par,
              handicap: h.handicap,
              yardage: h.yardage,
            })),
          },
        },
      });
      console.log(`  Created tee: ${course.name} / ${tee.name} (${tee.id})`);
    } else {
      console.log(`  Found tee: ${course.name} / ${tee.name} (${tee.id})`);
    }

    teeMap[key] = tee.id;

    // Link course to trip
    await prisma.tripCourse.upsert({
      where: { tripId_courseId: { tripId: trip.id, courseId: course.id } },
      update: {},
      create: { tripId: trip.id, courseId: course.id },
    });
  }

  // ---- Step 6: Create Rounds ----
  console.log('\n--- Step 6: Rounds ---');
  const roundMap = {}; // roundNum -> roundId
  for (const round of config.rounds) {
    const key = `${round.course}||${round.tee}`;
    const r = await prisma.round.create({
      data: {
        tripId: trip.id,
        teeId: teeMap[key],
        roundNumber: round.num,
        name: `Round ${round.num}`,
        format: round.format,
        skinsEnabled: round.skins,
        tiltEnabled: round.tilt,
        isComplete: true,
        verificationStatus: 'VERIFIED',
      },
    });
    roundMap[round.num] = r.id;
    console.log(`  R${round.num}: ${round.format} @ ${round.course}/${round.tee} (${r.id})`);
  }

  // ---- Step 7: Create Matches + MatchPlayers ----
  console.log('\n--- Step 7: Matches ---');
  const matchPlayerLookup = {}; // "excelName||roundNum" -> matchPlayerId

  // Load tee holes for handicap calculation
  const teeHolesCache = {};
  for (const round of config.rounds) {
    const key = `${round.course}||${round.tee}`;
    if (!teeHolesCache[key]) {
      const tee = await prisma.tee.findUnique({
        where: { id: teeMap[key] },
        include: { holes: { orderBy: { number: 'asc' } } },
      });
      teeHolesCache[key] = tee;
    }
  }

  for (const matchDef of config.matches) {
    const roundNum = matchDef.round;
    const roundConfig = config.rounds.find(r => r.num === roundNum);
    const key = `${roundConfig.course}||${roundConfig.tee}`;
    const tee = teeHolesCache[key];

    // Build match player list with course handicaps
    const allPlayers = [];
    for (const name of matchDef.side1) {
      const playerConfig = config.players.find(p => p.name === name);
      const cHdcp = courseHandicap(playerConfig.index, tee.slope);
      allPlayers.push({ name, side: 1, courseHdcp: cHdcp });
    }
    for (const name of matchDef.side2) {
      const playerConfig = config.players.find(p => p.name === name);
      const cHdcp = courseHandicap(playerConfig.index, tee.slope);
      allPlayers.push({ name, side: 2, courseHdcp: cHdcp });
    }

    // Compute playing handicaps
    computePlayingHandicaps(allPlayers, roundConfig.format, config.handicapConfig);

    // Create match
    const match = await prisma.match.create({
      data: {
        roundId: roundMap[roundNum],
        matchNumber: matchDef.num,
        status: 'COMPLETE',
        side1Points: matchDef.s1Pts,
        side2Points: matchDef.s2Pts,
        resultText: computeResultText(matchDef.s1Pts, matchDef.s2Pts),
        side1Attested: true,
        side2Attested: true,
      },
    });

    // Create match players
    for (const mp of allPlayers) {
      const matchPlayer = await prisma.matchPlayer.create({
        data: {
          matchId: match.id,
          tripPlayerId: tripPlayerMap[mp.name],
          courseHandicap: mp.courseHdcp,
          playingHandicap: mp.playingHandicap,
          side: mp.side,
        },
      });
      matchPlayerLookup[`${mp.name}||${roundNum}`] = matchPlayer.id;
    }

    console.log(`  R${roundNum} M${matchDef.num}: ${matchDef.side1.join('+')} vs ${matchDef.side2.join('+')} → ${matchDef.s1Pts}-${matchDef.s2Pts}`);
  }

  // ---- Step 8: Import Scores ----
  console.log('\n--- Step 8: Scores ---');
  let totalScores = 0;

  for (const roundConfig of config.rounds) {
    const roundNum = roundConfig.num;
    const sheetName = `ROUND ${roundNum}`;
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.log(`  Sheet "${sheetName}" not found, skipping!`);
      continue;
    }

    const key = `${roundConfig.course}||${roundConfig.tee}`;
    const tee = teeHolesCache[key];
    const holes = tee.holes; // sorted by number

    const sheetPlayers = extractPlayerScores(ws);
    console.log(`\n  R${roundNum} (${roundConfig.format}): ${sheetPlayers.length} players found in sheet`);

    // Build lookup: excel name -> scores
    const scoreMap = {};
    for (const sp of sheetPlayers) {
      scoreMap[sp.name] = sp;
    }

    const isTeamFormat = roundConfig.format === 'FOURSOMES' || roundConfig.format === 'SCRAMBLE';

    // Get matches for this round
    const roundMatches = config.matches.filter(m => m.round === roundNum);

    for (const matchDef of roundMatches) {
      const allPlayerNames = [...matchDef.side1, ...matchDef.side2];

      if (isTeamFormat) {
        // For team formats: find lead player per side, apply their scores to both
        for (const [sideNum, sideNames] of [[1, matchDef.side1], [2, matchDef.side2]]) {
          let leadScores = null;
          for (const name of sideNames) {
            // Try exact name first, then resolved DB name
            if (scoreMap[name]) { leadScores = scoreMap[name]; break; }
            const dbName = resolveDbName(name);
            if (scoreMap[dbName]) { leadScores = scoreMap[dbName]; break; }
          }

          if (!leadScores) {
            console.warn(`    R${roundNum} M${matchDef.num} Side ${sideNum}: No scores found!`);
            continue;
          }

          for (const name of sideNames) {
            const mpId = matchPlayerLookup[`${name}||${roundNum}`];
            if (!mpId) {
              console.warn(`    ${name} not in matchPlayerLookup for R${roundNum}`);
              continue;
            }
            const mp = await prisma.matchPlayer.findUnique({ where: { id: mpId } });

            for (let holeIdx = 0; holeIdx < 18; holeIdx++) {
              const hole = holes[holeIdx];
              const grossScore = leadScores.scores[holeIdx];
              if (grossScore === null || grossScore === undefined) continue; // skip missing holes
              const strokes = calcStrokesReceived(mp.playingHandicap, hole.handicap);
              const netScore = grossScore - strokes;

              await prisma.score.create({
                data: {
                  matchPlayerId: mpId,
                  tripPlayerId: tripPlayerMap[name],
                  holeId: hole.id,
                  grossScore,
                  netScore,
                  strokeReceived: strokes > 0,
                },
              });
              totalScores++;
            }
          }
        }
      } else {
        // Individual format: each player has their own scores
        for (const name of allPlayerNames) {
          const mpId = matchPlayerLookup[`${name}||${roundNum}`];
          if (!mpId) {
            console.warn(`    ${name} not in matchPlayerLookup for R${roundNum}`);
            continue;
          }
          const mp = await prisma.matchPlayer.findUnique({ where: { id: mpId } });

          // Find scores - try exact name, then resolved name
          let sp = scoreMap[name];
          if (!sp) sp = scoreMap[resolveDbName(name)];
          // Also try reverse: the Excel might use DB name
          if (!sp) {
            for (const [excelName, dbName] of Object.entries(NAME_ALIASES)) {
              if (dbName === name && scoreMap[excelName]) {
                sp = scoreMap[excelName];
                break;
              }
            }
          }

          if (!sp) {
            console.warn(`    ${name}: No scores found in sheet for R${roundNum}`);
            continue;
          }

          for (let holeIdx = 0; holeIdx < 18; holeIdx++) {
            const hole = holes[holeIdx];
            const grossScore = sp.scores[holeIdx];
            if (grossScore === null || grossScore === undefined) continue; // skip missing holes
            const strokes = calcStrokesReceived(mp.playingHandicap, hole.handicap);
            const netScore = grossScore - strokes;

            await prisma.score.create({
              data: {
                matchPlayerId: mpId,
                tripPlayerId: tripPlayerMap[name],
                holeId: hole.id,
                grossScore,
                netScore,
                strokeReceived: strokes > 0,
              },
            });
            totalScores++;
          }
        }
      }
    }
  }

  console.log(`\n  Total scores created: ${totalScores}`);

  // ---- Step 9: Verify ----
  console.log('\n--- Verification ---');
  const matches = await prisma.match.findMany({
    where: { round: { tripId: trip.id } },
    include: {
      round: true,
      players: { include: { tripPlayer: { include: { team: true } } } },
    },
  });

  const teamPoints = {};
  for (const m of matches) {
    for (const mp of m.players) {
      const teamName = mp.tripPlayer.team?.name || 'Unknown';
      const points = mp.side === 1 ? m.side1Points : m.side2Points;
      teamPoints[teamName] = (teamPoints[teamName] || 0) + points;
    }
  }

  // Divide by players per side to avoid double counting in team formats
  // Actually, each match point is per match, not per player. Count unique matches per team.
  const teamMatchPoints = { US: 0, Europe: 0 };
  for (const m of matches) {
    const side1Team = m.players.find(p => p.side === 1)?.tripPlayer.team?.name;
    const side2Team = m.players.find(p => p.side === 2)?.tripPlayer.team?.name;
    if (side1Team) teamMatchPoints[side1Team] = (teamMatchPoints[side1Team] || 0) + m.side1Points;
    if (side2Team) teamMatchPoints[side2Team] = (teamMatchPoints[side2Team] || 0) + m.side2Points;
  }

  console.log(`  US: ${teamMatchPoints['US']} points`);
  console.log(`  Europe: ${teamMatchPoints['Europe']} points`);
  console.log(`  Total: ${(teamMatchPoints['US'] || 0) + (teamMatchPoints['Europe'] || 0)} points`);

  const scoreCount = await prisma.score.count({
    where: { matchPlayer: { match: { round: { tripId: trip.id } } } },
  });
  console.log(`  Total scores in DB: ${scoreCount}`);

  console.log(`\n=== ${yearArg} seed complete! ===\n`);
}

main()
  .catch(err => {
    console.error('SEED FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
