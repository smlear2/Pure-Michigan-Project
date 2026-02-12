const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POINTS = { albatross: 16, eagle: 8, birdie: 4, par: 2, bogey: 0, doublePlus: -4 };

function getBasePoints(nvp) {
  if (nvp <= -3) return POINTS.albatross;
  if (nvp === -2) return POINTS.eagle;
  if (nvp === -1) return POINTS.birdie;
  if (nvp === 0) return POINTS.par;
  if (nvp === 1) return POINTS.bogey;
  return POINTS.doublePlus;
}

function calcStrokes(hdcp, holeHdcp) {
  if (hdcp <= 0) return 0;
  let s = 0;
  if (holeHdcp <= hdcp) s++;
  if (hdcp > 18 && holeHdcp <= (hdcp - 18)) s++;
  return s;
}

// TILT with NO multiplier cap
function tiltRound(holeScores) {
  const pids = new Set();
  for (const h of holeScores) for (const ps of h.playerScores) pids.add(ps.playerId);
  const results = new Map();
  for (const pid of pids) {
    let mult = 1, streak = 0, total = 0;
    for (const h of holeScores) {
      const ps = h.playerScores.find(p => p.playerId === pid);
      if (!ps) continue;
      const nvp = ps.netScore - ps.par;
      total += getBasePoints(nvp) * mult;
      if (nvp <= -1) {
        streak += (nvp <= -2) ? 2 : 1;
        mult = streak + 1; // NO CAP
      } else { streak = 0; mult = 1; }
    }
    results.set(pid, total);
  }
  return results;
}

const EXP_2023 = {
  'Dylan Plachta':  { R1: 34, R2: 28, R3: 38, R6: 30, total: 130 },
  'Ben Hammel':     { R1: 10, R2: 18, R3: 16, R6: 30, total: 74 },
  'Joe Ways':       { R1: 24, R2:  6, R3: 16, R6: 18, total: 64 },
  'Eric Barkovich': { R1: 16, R2: 12, R3:  0, R6:-14, total: 14 },
  'Stove Myers':    { R1: 36, R2:-12, R3: 24, R6:-14, total: 34 },
  'Zack Stitt':     { R1:  4, R2:-20, R3: 16, R6: -2, total: -2 },
  'Stephen Lear':   { R1: 22, R2: -6, R3:  8, R6: -4, total: 20 },
  'Zach Lear':      { R1: 26, R2: 20, R3: 24, R6:-22, total: 48 },
  'Danny Morales':  { R1: 46, R2:  6, R3: 26, R6: 22, total: 100 },
  'Tom Bostwick':   { R1:  6, R2: 30, R3: 14, R6:  4, total: 54 },
  'Joey Aiello':    { R1: 20, R2: 36, R3: 20, R6: 42, total: 118 },
  'Dave Meyer':     { R1: 70, R2: 10, R3:  8, R6: 18, total: 106 },
  'Joe Spencer':    { R1: -4, R2: 24, R3: 18, R6:-40, total: -2 },
  'Kip Owen':       { R1:  0, R2:  0, R3:  0, R6:  0, total: 0 },
};

async function main() {
  const trip = await prisma.trip.findFirst({ where: { year: 2023 } });
  const tps = await prisma.tripPlayer.findMany({
    where: { tripId: trip.id },
    include: { user: { select: { name: true } } }
  });
  const nameMap = new Map(tps.map(tp => [tp.id, tp.user.name]));
  const indexMap = new Map(tps.map(tp => [tp.id, tp.handicapAtTime]));
  // Kip Owen is opted out
  const tiltOptedIn = new Set(tps.filter(tp => tp.tiltOptIn && tp.user.name !== 'Kip Owen').map(tp => tp.id));

  const rounds = await prisma.round.findMany({
    where: { tripId: trip.id, tiltEnabled: true },
    include: { tee: { include: { holes: { orderBy: { number: 'asc' } }, course: { select: { name: true } } } } },
    orderBy: { roundNumber: 'asc' }
  });

  console.log('=== 2023 TILT: WHS skins handicap, NO cap, NO carryover ===\n');

  const grandTotals = new Map();
  let roundMatch = 0, roundTotal = 0;

  for (const round of rounds) {
    const rKey = 'R' + round.roundNumber;
    const holes = round.tee.holes;
    const slope = round.tee.slope;
    const rating = round.tee.rating;
    const coursePar = holes.reduce((s, h) => s + h.par, 0);

    const scores = await prisma.score.findMany({
      where: { matchPlayer: { match: { roundId: round.id } } },
      include: { hole: true, matchPlayer: { select: { tripPlayerId: true } } }
    });

    const holeScoresMap = new Map();
    for (const score of scores) {
      const tpId = score.matchPlayer.tripPlayerId;
      if (!tiltOptedIn.has(tpId)) continue;
      if (!holeScoresMap.has(score.holeId)) holeScoresMap.set(score.holeId, new Map());
      const hm = holeScoresMap.get(score.holeId);
      if (!hm.has(tpId)) {
        const idx = indexMap.get(tpId);
        const raw = (idx * slope / 113 + (rating - coursePar)) * 0.8;
        const hdcp = Math.min(24, Math.max(0, Math.ceil(raw)));
        hm.set(tpId, { netScore: score.grossScore - calcStrokes(hdcp, score.hole.handicap), par: score.hole.par });
      }
    }

    const hs = holes.map(hole => {
      const hm = holeScoresMap.get(hole.id);
      if (!hm) return { holeNumber: hole.number, playerScores: [] };
      return { holeNumber: hole.number, playerScores: Array.from(hm.entries()).map(([id, d]) => ({ playerId: id, netScore: d.netScore, par: d.par })) };
    });

    const results = tiltRound(hs);

    console.log('--- ' + rKey + ' (' + round.format + ') ' + round.tee.course.name + ' ---');
    const sorted = Array.from(results.entries())
      .map(([id, pts]) => ({ name: nameMap.get(id), pts }))
      .sort((a, b) => b.pts - a.pts);

    for (const p of sorted) {
      const exp = EXP_2023[p.name]?.[rKey];
      const mark = exp !== undefined ? (p.pts === exp ? ' OK' : ' DIFF(exp=' + exp + ')') : '';
      console.log('  ' + p.name.padEnd(20) + String(p.pts).padStart(5) + mark);
      if (exp !== undefined) { roundTotal++; if (p.pts === exp) roundMatch++; }
    }

    for (const [id, pts] of results) {
      grandTotals.set(id, (grandTotals.get(id) || 0) + pts);
    }
  }

  console.log('\n=== GRAND TOTAL ===');
  let totalMatch = 0, totalChecked = 0;
  const standings = Array.from(grandTotals.entries())
    .map(([id, pts]) => ({ id, name: nameMap.get(id), pts }))
    .sort((a, b) => b.pts - a.pts);

  for (const s of standings) {
    const exp = EXP_2023[s.name]?.total;
    const mark = exp !== undefined ? (s.pts === exp ? ' OK' : ' DIFF(exp=' + exp + ')') : '';
    if (exp !== undefined) { totalChecked++; if (s.pts === exp) totalMatch++; }
    console.log('  ' + s.name.padEnd(20) + String(s.pts).padStart(6) + mark);
  }

  console.log('\nPer-round: ' + roundMatch + '/' + roundTotal + ' match');
  console.log('Totals: ' + totalMatch + '/' + totalChecked + ' match');
}

main().then(() => process.exit());
