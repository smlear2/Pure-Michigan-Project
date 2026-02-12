const { PrismaClient } = require('@prisma/client');
const { calculateSkins } = require('../src/lib/golf');

const prisma = new PrismaClient();

function whsSkinsCourseHandicap(index, slope, rating, par, max = 24) {
  const raw = (index * slope / 113 + (rating - par)) * 0.8;
  return Math.min(Math.ceil(raw), max);
}

function calcStrokesFromWHS(whsHdcp, holeHdcp) {
  if (whsHdcp <= 0) return 0;
  let strokes = 0;
  if (holeHdcp <= whsHdcp) strokes++;
  if (whsHdcp > 18 && holeHdcp <= (whsHdcp - 18)) strokes++;
  return strokes;
}

// Expected 2023 skins payouts from Excel
const EXPECTED = {
  'Dylan Plachta': 256.80,
  'Ben Hammel': 114.55,
  'Joe Ways': 60.00,
  'Eric Barkovich': 97.40,
  'Stove Myers': 106.19,
  'Maxwell Huntley': 93.33,
  'Ryan Hubona': 193.46,
  'Zack Stitt': 136.80,
  'Stephen Lear': 0,
  'Zach Lear': 42.86,
  'Danny Morales': 0,
  'Tom Bostwick': 30.00,
  'Joey Aiello': 139.09,
  'Dave Meyer': 96.67,
  'Joe Spencer': 132.86,
  'Kip Owen': 0,
};

async function main() {
  const trip = await prisma.trip.findFirst({ where: { year: 2023 } });
  const hdcpConfig = trip.handicapConfig;
  const skinsTeamCombos = hdcpConfig?.skinsTeamCombos ?? hdcpConfig?.teamCombos ?? {};

  const tripPlayers = await prisma.tripPlayer.findMany({
    where: { tripId: trip.id },
    include: { user: { select: { name: true } } }
  });
  const nameMap = new Map(tripPlayers.map(tp => [tp.id, tp.user.name]));
  const indexMap = new Map(tripPlayers.map(tp => [tp.id, tp.handicapAtTime]));
  const skinsOptedIn = new Set(tripPlayers.filter(tp => tp.skinsOptIn).map(tp => tp.id));

  const rounds = await prisma.round.findMany({
    where: { tripId: trip.id, skinsEnabled: true },
    include: {
      tee: {
        include: {
          holes: { orderBy: { number: 'asc' } },
          course: { select: { name: true } }
        }
      },
    },
    orderBy: { roundNumber: 'asc' }
  });

  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { match: { round: { tripId: trip.id } } },
    include: { match: { select: { id: true, roundId: true } } }
  });
  const roundTeams = new Map();
  for (const mp of matchPlayers) {
    const rid = mp.match.roundId;
    if (!roundTeams.has(rid)) roundTeams.set(rid, new Map());
    const matchMap = roundTeams.get(rid);
    const key = mp.match.id + ':' + mp.side;
    if (!matchMap.has(key)) matchMap.set(key, []);
    matchMap.get(key).push(mp.tripPlayerId);
  }

  const allScores = await prisma.score.findMany({
    where: { matchPlayer: { match: { round: { tripId: trip.id, skinsEnabled: true } } } },
    include: {
      hole: true,
      matchPlayer: { select: { tripPlayerId: true, matchId: true, side: true, match: { select: { roundId: true } } } }
    }
  });

  const scoresByRound = new Map();
  for (const s of allScores) {
    const rid = s.matchPlayer.match.roundId;
    if (!scoresByRound.has(rid)) scoresByRound.set(rid, []);
    scoresByRound.get(rid).push(s);
  }

  const grandTotals = new Map();
  let totalMatch = 0, totalDiff = 0;

  for (const round of rounds) {
    const rKey = 'R' + round.roundNumber;
    const isTeamFormat = round.format === 'FOURSOMES' || round.format === 'SCRAMBLE';
    const isScramble = round.format === 'SCRAMBLE';
    const slope = round.tee.slope;
    const rating = round.tee.rating;
    const holes = round.tee.holes;
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);

    console.log('\n=== ' + rKey + ' (' + round.format + ') ' + round.tee.course.name + ' ' + round.tee.name + ' ===');

    const roundScores = scoresByRound.get(round.id) || [];

    // Build team mapping
    const playerToTeamRep = new Map();
    if (isTeamFormat) {
      const teams = roundTeams.get(round.id);
      if (teams) {
        for (const [, members] of teams) {
          if (members.length >= 2) {
            for (const m of members) playerToTeamRep.set(m, members[0]);
          }
        }
      }
    }

    // Compute individual skins handicaps
    const whsHdcps = new Map();
    for (const tp of tripPlayers) {
      if (!skinsOptedIn.has(tp.id)) continue;
      if (isScramble) {
        whsHdcps.set(tp.id, 0);
      } else {
        const idx = indexMap.get(tp.id);
        whsHdcps.set(tp.id, whsSkinsCourseHandicap(idx, slope, rating, coursePar));
      }
    }

    // Compute team handicaps
    const teamHdcps = new Map();
    if (isTeamFormat && !isScramble && skinsTeamCombos[round.format]) {
      const combo = skinsTeamCombos[round.format];
      const teams = roundTeams.get(round.id);
      if (teams) {
        for (const [teamKey, members] of teams) {
          const optedMembers = members.filter(id => skinsOptedIn.has(id));
          if (optedMembers.length >= 2) {
            const hdcps = optedMembers.map(id => whsHdcps.get(id)).sort((a, b) => a - b);
            teamHdcps.set(teamKey, Math.round(hdcps[0] * combo.lowPct / 100 + hdcps[1] * combo.highPct / 100));
          }
        }
      }
    }

    // Build hole scores
    const holeScoresMap = new Map();
    const uniquePlayers = new Set();

    for (const score of roundScores) {
      const tpId = score.matchPlayer.tripPlayerId;
      if (!skinsOptedIn.has(tpId)) continue;
      uniquePlayers.add(tpId);

      const teamKey = isTeamFormat ? (score.matchPlayer.matchId + ':' + score.matchPlayer.side) : null;
      const effectiveId = isTeamFormat ? teamKey : tpId;

      if (!holeScoresMap.has(score.holeId)) holeScoresMap.set(score.holeId, new Map());
      const holeMap = holeScoresMap.get(score.holeId);

      if (!holeMap.has(effectiveId)) {
        if (isScramble) {
          holeMap.set(effectiveId, score.grossScore);
        } else if (isTeamFormat) {
          const hdcp = teamHdcps.get(teamKey) ?? whsHdcps.get(tpId);
          const strokes = calcStrokesFromWHS(hdcp, score.hole.handicap);
          holeMap.set(effectiveId, score.grossScore - strokes);
        } else {
          const hdcp = whsHdcps.get(tpId);
          const strokes = calcStrokesFromWHS(hdcp, score.hole.handicap);
          holeMap.set(effectiveId, score.grossScore - strokes);
        }
      }
    }

    // Expected competing unit count
    const expectedUnits = isTeamFormat
      ? new Set(Array.from(roundScores)
          .filter(s => skinsOptedIn.has(s.matchPlayer.tripPlayerId))
          .map(s => s.matchPlayer.matchId + ':' + s.matchPlayer.side)).size
      : uniquePlayers.size;

    const holeScores = holes.map(hole => {
      const holeMap = holeScoresMap.get(hole.id);
      // Exclude incomplete holes
      if (!holeMap || holeMap.size < expectedUnits) {
        return { holeNumber: hole.number, playerScores: [] };
      }
      return {
        holeNumber: hole.number,
        playerScores: Array.from(holeMap.entries()).map(([playerId, netScore]) => ({
          playerId, netScore,
        }))
      };
    });

    const result = calculateSkins(holeScores, 20, uniquePlayers.size, false);

    // Distribute team winnings
    const playerPayouts = new Map();
    if (isTeamFormat) {
      const teams = roundTeams.get(round.id);
      const teamKeyToMembers = new Map();
      if (teams) {
        for (const [teamKey, members] of teams) {
          const optedMembers = members.filter(id => skinsOptedIn.has(id));
          teamKeyToMembers.set(teamKey, optedMembers);
        }
      }
      for (const pt of result.playerTotals) {
        const members = teamKeyToMembers.get(pt.playerId) || [];
        const perMember = pt.moneyWon / members.length;
        for (const m of members) {
          playerPayouts.set(m, (playerPayouts.get(m) || 0) + perMember);
        }
      }
    } else {
      for (const pt of result.playerTotals) {
        playerPayouts.set(pt.playerId, pt.moneyWon);
      }
    }

    console.log('  Skins: ' + result.skinsAwarded + ', skinValue=$' + result.skinValue.toFixed(2) + ', pot=$' + (20 * uniquePlayers.size));

    const allNames = new Set([
      ...Array.from(playerPayouts.keys()).map(id => nameMap.get(id))
    ]);
    for (const name of Array.from(allNames).sort()) {
      const tpId = tripPlayers.find(tp => tp.user.name === name)?.id;
      const computed = tpId ? (playerPayouts.get(tpId) || 0) : 0;
      if (computed > 0) {
        console.log('    ' + name.padEnd(20) + ' $' + computed.toFixed(2));
        grandTotals.set(name, (grandTotals.get(name) || 0) + computed);
      }
    }
  }

  console.log('\n=== 2023 GRAND TOTAL COMPARISON ===');
  const allNames = new Set([...Object.keys(EXPECTED), ...Array.from(grandTotals.keys())]);
  for (const name of Array.from(allNames).sort()) {
    const computed = grandTotals.get(name) || 0;
    const exp = EXPECTED[name] || 0;
    const diff = Math.abs(computed - exp);
    if (diff < 0.1) totalMatch++;
    else totalDiff++;
    if (computed > 0 || exp > 0) {
      console.log('  ' + name.padEnd(20) + ' $' + computed.toFixed(2).padStart(8) + '  exp:$' + exp.toFixed(2).padStart(8) + '  ' + (diff < 0.1 ? 'OK' : 'DIFF'));
    }
  }
  console.log('\n=== TOTAL: ' + totalMatch + ' OK, ' + totalDiff + ' diff ===');
}

main().then(() => process.exit());
