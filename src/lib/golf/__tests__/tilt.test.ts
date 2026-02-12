import { describe, it, expect } from 'vitest'
import { calculateTilt, TiltHoleScore } from '../tilt'
import { calculateTiltPayouts } from '../compute-tilt'

describe('calculateTilt', () => {
  // Helper to make a single-player hole score
  const hole = (num: number, netScore: number, par: number): TiltHoleScore => ({
    holeNumber: num,
    playerScores: [{ playerId: 'p1', netScore, par }],
  })

  it('assigns correct base points for each score type', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 2, 4),  // birdie (-2 is eagle, -1 is birdie) — net 2 on par 4 = eagle
      hole(2, 3, 4),  // birdie (net 3 on par 4)
      hole(3, 4, 4),  // par
      hole(4, 5, 4),  // bogey
      hole(5, 6, 4),  // double bogey
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[0].basePoints).toBe(8)   // eagle
    expect(p.holes[1].basePoints).toBe(4)   // birdie
    expect(p.holes[2].basePoints).toBe(2)   // par
    expect(p.holes[3].basePoints).toBe(0)   // bogey
    expect(p.holes[4].basePoints).toBe(-4)  // double bogey
  })

  it('applies 2x multiplier after a birdie', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → sets 2x for next
      hole(2, 4, 4),  // par at 2x = 2 × 2 = 4 → resets to 1x
      hole(3, 4, 4),  // par at 1x = 2
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[0].multiplier).toBe(1)  // first hole starts at 1x
    expect(p.holes[0].points).toBe(4)      // birdie × 1 = 4
    expect(p.holes[1].multiplier).toBe(2)  // 2x from birdie
    expect(p.holes[1].points).toBe(4)      // par × 2 = 4
    expect(p.holes[2].multiplier).toBe(1)  // reset after par
    expect(p.holes[2].points).toBe(2)      // par × 1 = 2
    expect(p.totalPoints).toBe(10)
  })

  it('reaches 3x after two consecutive birdies', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → 2x
      hole(2, 3, 4),  // birdie at 2x → 3x
      hole(3, 4, 4),  // par at 3x = 6 → resets
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[0].multiplier).toBe(1)
    expect(p.holes[1].multiplier).toBe(2)
    expect(p.holes[1].points).toBe(8)      // birdie × 2
    expect(p.holes[2].multiplier).toBe(3)
    expect(p.holes[2].points).toBe(6)      // par × 3
  })

  it('eagle counts as two birdies → instant 3x', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 2, 4),  // eagle → streak=2, mult=3
      hole(2, 4, 4),  // par at 3x = 6 → resets
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[0].multiplier).toBe(1)
    expect(p.holes[0].points).toBe(8)      // eagle × 1
    expect(p.holes[1].multiplier).toBe(3)
    expect(p.holes[1].points).toBe(6)      // par × 3
  })

  it('multiplier applies to negative points', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → 2x
      hole(2, 6, 4),  // double bogey at 2x = -4 × 2 = -8 → resets
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[1].multiplier).toBe(2)
    expect(p.holes[1].basePoints).toBe(-4)
    expect(p.holes[1].points).toBe(-8)
  })

  it('bogey takes the hit then resets multiplier', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → 2x
      hole(2, 6, 4),  // double bogey at 2x = -8 → resets to 1x
      hole(3, 4, 4),  // par at 1x = 2
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[1].multiplier).toBe(2)   // still 2x for the double bogey hole
    expect(p.holes[1].points).toBe(-8)      // ouch
    expect(p.holes[2].multiplier).toBe(1)   // back to 1x after bogey+
    expect(p.holes[2].points).toBe(2)
    expect(p.totalPoints).toBe(4 + -8 + 2)  // -2
  })

  it('supports carryover starting multiplier from previous round', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 4, 4),  // par at 3x (carried over) = 6 → resets
      hole(2, 4, 4),  // par at 1x = 2
    ]
    const result = calculateTilt(holes, 0, 1, {
      startingMultiplier: 3,
      startingStreak: 2,
    })
    const p = result.players[0]

    expect(p.holes[0].multiplier).toBe(3)
    expect(p.holes[0].points).toBe(6)
    expect(p.holes[1].multiplier).toBe(1)
  })

  it('multiplier grows beyond 3x with consecutive birdies (no cap)', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → streak=1, mult=2 for next
      hole(2, 3, 4),  // birdie at 2x → streak=2, mult=3 for next
      hole(3, 3, 4),  // birdie at 3x → streak=3, mult=4 for next
      hole(4, 3, 4),  // birdie at 4x → streak=4, mult=5 for next
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.holes[0].multiplier).toBe(1)
    expect(p.holes[1].multiplier).toBe(2)
    expect(p.holes[2].multiplier).toBe(3)
    expect(p.holes[3].multiplier).toBe(4)
    expect(p.holes[0].points).toBe(4)   // 4 × 1
    expect(p.holes[1].points).toBe(8)   // 4 × 2
    expect(p.holes[2].points).toBe(12)  // 4 × 3
    expect(p.holes[3].points).toBe(16)  // 4 × 4
    expect(p.totalPoints).toBe(40)
    expect(p.finalMultiplier).toBe(5)
    expect(p.finalStreak).toBe(4)
  })

  it('calculates pot and entry fee', () => {
    const holes: TiltHoleScore[] = [{
      holeNumber: 1,
      playerScores: [
        { playerId: 'p1', netScore: 4, par: 4 },
        { playerId: 'p2', netScore: 4, par: 4 },
        { playerId: 'p3', netScore: 4, par: 4 },
        { playerId: 'p4', netScore: 4, par: 4 },
      ],
    }]
    const result = calculateTilt(holes, 20, 4)

    expect(result.totalPot).toBe(80)
    expect(result.entryFee).toBe(20)
    expect(result.playerCount).toBe(4)
    expect(result.players).toHaveLength(4)
  })

  it('handles empty holes', () => {
    const result = calculateTilt([], 20, 4)
    expect(result.players).toHaveLength(0)
    expect(result.totalPot).toBe(80)
  })

  it('full 18-hole scenario with multiple players', () => {
    // p1: consistent pars (2 pts each = 36)
    // p2: birdie then double on tilt, otherwise pars
    const holes: TiltHoleScore[] = Array.from({ length: 18 }, (_, i) => {
      const num = i + 1
      if (num === 1) {
        return {
          holeNumber: num,
          playerScores: [
            { playerId: 'p1', netScore: 4, par: 4 },  // par
            { playerId: 'p2', netScore: 3, par: 4 },  // birdie → 2x
          ],
        }
      }
      if (num === 2) {
        return {
          holeNumber: num,
          playerScores: [
            { playerId: 'p1', netScore: 4, par: 4 },  // par
            { playerId: 'p2', netScore: 6, par: 4 },  // double at 2x = -8 → reset
          ],
        }
      }
      return {
        holeNumber: num,
        playerScores: [
          { playerId: 'p1', netScore: 4, par: 4 },
          { playerId: 'p2', netScore: 4, par: 4 },
        ],
      }
    })

    const result = calculateTilt(holes, 20, 2)
    const p1 = result.players.find(p => p.playerId === 'p1')!
    const p2 = result.players.find(p => p.playerId === 'p2')!

    // p1: 18 pars × 2 = 36
    expect(p1.totalPoints).toBe(36)
    // p2: birdie(4) + double@2x(-8) + 16 pars(32) = 28
    expect(p2.totalPoints).toBe(28)
    // p1 should be ranked first
    expect(result.players[0].playerId).toBe('p1')
  })

  it('allows custom point values', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie
    ]
    const result = calculateTilt(holes, 0, 1, {
      points: { birdie: 10 },
    })
    expect(result.players[0].holes[0].basePoints).toBe(10)
    expect(result.players[0].holes[0].points).toBe(10)
  })

  it('returns final multiplier and streak for carryover', () => {
    const holes: TiltHoleScore[] = [
      hole(1, 3, 4),  // birdie → streak=1, mult=2
      hole(2, 3, 4),  // birdie at 2x → streak=2, mult=3
    ]
    const result = calculateTilt(holes, 0, 1)
    const p = result.players[0]

    expect(p.finalMultiplier).toBe(3)
    expect(p.finalStreak).toBe(2)
  })
})

describe('calculateTiltPayouts', () => {
  it('pays top 3 at 60/30/10', () => {
    const totals = new Map([['p1', 200], ['p2', 150], ['p3', 100], ['p4', 50]])
    const payouts = calculateTiltPayouts(totals, 700)
    expect(payouts.get('p1')).toBe(420)  // 60%
    expect(payouts.get('p2')).toBe(210)  // 30%
    expect(payouts.get('p3')).toBe(70)   // 10%
    expect(payouts.has('p4')).toBe(false)
  })

  it('splits 1st+2nd when two tied for 1st', () => {
    const totals = new Map([['p1', 200], ['p2', 200], ['p3', 100]])
    const payouts = calculateTiltPayouts(totals, 1000)
    // Tied for 1st: split 60% + 30% = 90% → 45% each
    expect(payouts.get('p1')).toBeCloseTo(450)
    expect(payouts.get('p2')).toBeCloseTo(450)
    // 3rd gets 10%
    expect(payouts.get('p3')).toBeCloseTo(100)
  })

  it('splits entire pot when three or more tied for 1st', () => {
    const totals = new Map([['p1', 100], ['p2', 100], ['p3', 100], ['p4', 50]])
    const payouts = calculateTiltPayouts(totals, 600)
    // 3 tied for 1st: split 60%+30%+10% = 100% → 33.33% each
    expect(payouts.get('p1')).toBeCloseTo(200)
    expect(payouts.get('p2')).toBeCloseTo(200)
    expect(payouts.get('p3')).toBeCloseTo(200)
    expect(payouts.has('p4')).toBe(false)
  })

  it('splits 2nd+3rd when two tied for 2nd', () => {
    const totals = new Map([['p1', 200], ['p2', 100], ['p3', 100], ['p4', 50]])
    const payouts = calculateTiltPayouts(totals, 1000)
    expect(payouts.get('p1')).toBe(600)  // 60%
    // Tied for 2nd: split 30% + 10% = 40% → 20% each
    expect(payouts.get('p2')).toBe(200)
    expect(payouts.get('p3')).toBe(200)
    expect(payouts.has('p4')).toBe(false)
  })

  it('returns empty map for empty input', () => {
    const payouts = calculateTiltPayouts(new Map(), 700)
    expect(payouts.size).toBe(0)
  })
})
