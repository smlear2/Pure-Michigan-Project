const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// ── TILT engine (same as production) ──

function skinsHandicap(index, slope, rating, coursePar, maxHdcp) {
  const raw = (index * slope / 113 + (rating - coursePar)) * 0.8
  return Math.min(Math.ceil(raw), maxHdcp || 24)
}
function receivesStroke(hcp, holeHdcp) { return hcp >= holeHdcp }
function receivesDoubleStroke(hcp, holeHdcp) { return hcp >= holeHdcp + 18 }

function tiltPoints(net, par) {
  const d = net - par
  if (d <= -3) return 16
  if (d === -2) return 8
  if (d === -1) return 4
  if (d === 0) return 2
  if (d === 1) return 0
  return -4
}

function computePlayer(holes, startMult, startStreak) {
  let mult = startMult || 1, streak = startStreak || 0, total = 0
  for (const h of holes) {
    const bp = tiltPoints(h.net, h.par)
    const d = h.net - h.par
    total += bp * mult
    if (d <= -1) { streak += d === -2 ? 2 : d <= -3 ? 3 : 1; mult = streak + 1 }
    else { streak = 0; mult = 1 }
  }
  return { total, mult, streak }
}

// Top-3 payout: 60/30/10
const PCT = [0.60, 0.30, 0.10]
function calcPayouts(totals, pot) {
  const payouts = new Map()
  if (totals.size === 0 || pot === 0) return payouts
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  let pos = 0, i = 0
  while (i < sorted.length && pos < PCT.length) {
    const score = sorted[i][1]
    const tied = []
    while (i < sorted.length && sorted[i][1] === score) { tied.push(sorted[i][0]); i++ }
    let pct = 0
    for (let p = pos; p < Math.min(pos + tied.length, PCT.length); p++) pct += PCT[p]
    const per = (pct * pot) / tied.length
    for (const id of tied) payouts.set(id, Math.round(per * 100) / 100)
    pos += tied.length
  }
  return payouts
}

// ── Expected data (keyed by DB name) ──
// DB names: "Stove Myers", "Joe Ways", "Zack Stitt"

const YEARS = {
  2023: {
    carryover: false,
    entryFee: 50,
    expected: {
      // tiltOptIn=true players (14)
      'Dylan Plachta': { total: 130, payout: 420 },
      'Ben Hammel': { total: 74, payout: 0 },
      'Joe Ways': { total: 64, payout: 0 },
      'Eric Barkovich': { total: 14, payout: 0 },
      'Stove Myers': { total: 34, payout: 0 },
      'Zack Stitt': { total: -2, payout: 0 },
      'Stephen Lear': { total: 20, payout: 0 },
      'Zach Lear': { total: 48, payout: 0 },
      'Danny Morales': { total: 100, payout: 0 },
      'Tom Bostwick': { total: 54, payout: 0 },
      'Joey Aiello': { total: 118, payout: 210 },
      'Dave Meyer': { total: 106, payout: 70 },
      'Joe Spencer': { total: -2, payout: 0 },
    },
  },
  2024: {
    carryover: true,
    entryFee: 50,
    expected: {
      // tiltOptIn=true players (11)
      'Dylan Plachta': { total: 70, payout: 0 },
      'Ben Hammel': { total: 150, payout: 330 },
      'Joe Ways': { total: 68, payout: 0 },
      'Tom Bostwick': { total: 80, payout: 0 },
      'Alex Paxton': { total: 100, payout: 55 },
      'Joe Spencer': { total: 34, payout: 0 },
      'Stephen Lear': { total: 74, payout: 0 },
      'Joey Aiello': { total: 76, payout: 0 },
      'Zach Lear': { total: 42, payout: 0 },
      'Danny Morales': { total: 58, payout: 0 },
      'Stove Myers': { total: 120, payout: 165 },
    },
  },
  2025: {
    carryover: true,
    entryFee: 50,
    expected: {
      // tiltOptIn=true players (14)
      'Stephen Lear': { total: 86, payout: 0 },
      'Joey Aiello': { total: 186, payout: 210 },
      'Danny Morales': { total: 146, payout: 70 },
      'Dave Meyer': { total: 84, payout: 0 },
      'Alex Paxton': { total: 140, payout: 0 },
      'Dylan Plachta': { total: 44, payout: 0 },
      'Joe Spencer': { total: 16, payout: 0 },
      'Tom Bostwick': { total: 110, payout: 0 },
      'Ben Hammel': { total: 202, payout: 420 },
      'Zach Lear': { total: 52, payout: 0 },
      'Joe Ways': { total: 124, payout: 0 },
      'Maxwell Huntley': { total: 50, payout: 0 },
      'Eric Barkovich': { total: 38, payout: 0 },
      'Kip Owen': { total: 62, payout: 0 },
    },
  },
}

async function verifyYear(year) {
  const cfg = YEARS[year]
  const trip = await p.trip.findFirst({ where: { year } })
  if (!trip) { console.log(`  No ${year} trip`); return { scoreOk: 0, scoreFail: 0, payOk: 0, payFail: 0 } }

  const maxHdcp = trip.handicapConfig?.maxHandicap || 24
  const expectedNames = new Set(Object.keys(cfg.expected))

  const rounds = await p.round.findMany({
    where: { tripId: trip.id, tiltEnabled: true },
    include: { tee: { include: { holes: { orderBy: { number: 'asc' } } } } },
    orderBy: { roundNumber: 'asc' },
  })

  const tps = await p.tripPlayer.findMany({
    where: { tripId: trip.id, isActive: true, tiltOptIn: true },
    include: { user: { select: { name: true } } },
  })

  // Verify opt-in count matches expected
  const optInNames = tps.map(tp => tp.user.name)
  console.log(`  DB opt-in: ${tps.length}, expected: ${expectedNames.size}`)

  const grandTotals = new Map() // DB name → total
  const carryState = {} // tpId → { mult, streak }

  for (const round of rounds) {
    const coursePar = round.tee.holes.reduce((s, h) => s + h.par, 0)

    const scores = await p.score.findMany({
      where: { matchPlayer: { match: { roundId: round.id } } },
      include: {
        hole: true,
        matchPlayer: { select: { tripPlayerId: true } },
      },
    })

    // Build tpId → name map
    const tpNameMap = new Map()
    for (const tp of tps) tpNameMap.set(tp.id, tp.user.name)

    // Group by player
    const byPlayer = new Map()
    for (const s of scores) {
      const tpId = s.matchPlayer.tripPlayerId
      if (!tpNameMap.has(tpId)) continue
      if (!byPlayer.has(tpId)) byPlayer.set(tpId, [])

      const hole = round.tee.holes.find(h => h.id === s.holeId)
      if (!hole) continue
      const existing = byPlayer.get(tpId).find(h => h.number === hole.number)
      if (!existing) {
        const tp = tps.find(t => t.id === tpId)
        const idx = tp.handicapAtTime || 0
        const hcp = skinsHandicap(idx, round.tee.slope, round.tee.rating, coursePar, maxHdcp)
        const strk = receivesDoubleStroke(hcp, hole.handicap) ? 2 : receivesStroke(hcp, hole.handicap) ? 1 : 0
        byPlayer.get(tpId).push({ number: hole.number, net: s.grossScore - strk, par: hole.par })
      }
    }

    for (const [tpId, holes] of byPlayer) {
      holes.sort((a, b) => a.number - b.number)
      const sm = cfg.carryover ? (carryState[tpId]?.mult || 1) : 1
      const ss = cfg.carryover ? (carryState[tpId]?.streak || 0) : 0
      const { total, mult, streak } = computePlayer(holes, sm, ss)
      carryState[tpId] = { mult, streak }

      const name = tpNameMap.get(tpId)
      grandTotals.set(name, (grandTotals.get(name) || 0) + total)
    }
  }

  // Check totals
  let scoreOk = 0, scoreFail = 0
  const sorted = Array.from(grandTotals.entries()).sort((a, b) => b[1] - a[1])
  for (const [name, computed] of sorted) {
    const exp = cfg.expected[name]
    if (!exp) continue
    if (computed === exp.total) scoreOk++
    else {
      scoreFail++
      console.log(`  SCORE DIFF: ${name} computed=${computed} expected=${exp.total}`)
    }
  }
  // Check players in expected but not in grandTotals (e.g., no scores)
  for (const name of expectedNames) {
    if (!grandTotals.has(name)) {
      const exp = cfg.expected[name]
      if (exp.total === 0) scoreOk++ // Expected 0, got 0 (no entries)
      else { scoreFail++; console.log(`  SCORE MISSING: ${name} expected=${exp.total}`) }
    }
  }

  // Check payouts
  const playerCount = expectedNames.size
  const pot = cfg.entryFee * playerCount
  const payouts = calcPayouts(grandTotals, pot)

  let payOk = 0, payFail = 0
  for (const [name, exp] of Object.entries(cfg.expected)) {
    const computed = payouts.get(name) || 0
    if (Math.abs(computed - exp.payout) < 0.01) payOk++
    else {
      payFail++
      console.log(`  PAYOUT DIFF: ${name} computed=$${computed} expected=$${exp.payout}`)
    }
  }

  return { scoreOk, scoreFail, payOk, payFail }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║     TILT VERIFICATION — ALL YEARS           ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  let totalScoreOk = 0, totalScoreFail = 0, totalPayOk = 0, totalPayFail = 0

  for (const year of [2023, 2024, 2025]) {
    const cfg = YEARS[year]
    const playerCount = Object.keys(cfg.expected).length
    const pot = cfg.entryFee * playerCount
    console.log(`── ${year} (carryover=${cfg.carryover}, ${playerCount} players, pot=$${pot}) ──`)
    const r = await verifyYear(year)
    console.log(`  Scores: ${r.scoreOk}/${r.scoreOk + r.scoreFail} ${r.scoreFail === 0 ? '✓' : '✗'}`)
    console.log(`  Payouts: ${r.payOk}/${r.payOk + r.payFail} ${r.payFail === 0 ? '✓' : '✗'}`)
    totalScoreOk += r.scoreOk; totalScoreFail += r.scoreFail
    totalPayOk += r.payOk; totalPayFail += r.payFail
  }

  console.log(`\n${'═'.repeat(46)}`)
  console.log(`SCORES: ${totalScoreOk}/${totalScoreOk + totalScoreFail} ${totalScoreFail === 0 ? '✓ ALL MATCH' : '✗ FAILURES'}`)
  console.log(`PAYOUTS: ${totalPayOk}/${totalPayOk + totalPayFail} ${totalPayFail === 0 ? '✓ ALL MATCH' : '✗ FAILURES'}`)
  console.log(`${'═'.repeat(46)}`)

  await p.$disconnect()
}
main()
