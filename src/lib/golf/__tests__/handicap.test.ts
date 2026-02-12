import { describe, it, expect } from 'vitest'
import {
  courseHandicap,
  playingHandicap,
  strokeAllocation,
  receivesStroke,
  receivesDoubleStroke,
  adjustedHandicap,
  teamHandicap,
  computeMatchHandicaps,
  skinsHandicap,
  teamSkinsHandicap,
  HoleInfo,
  HandicapConfig,
} from '../handicap'

describe('courseHandicap', () => {
  it('calculates standard course handicap', () => {
    // 15 index, 135 slope → round(15 * 135 / 113) = round(17.92) = 18
    expect(courseHandicap(15, 135)).toBe(18)
  })

  it('rounds correctly', () => {
    // 10 index, 113 slope → round(10 * 113 / 113) = 10
    expect(courseHandicap(10, 113)).toBe(10)
  })

  it('handles scratch golfer', () => {
    expect(courseHandicap(0, 135)).toBe(0)
  })

  it('handles high handicap', () => {
    // 30 index, 140 slope → round(30 * 140 / 113) = round(37.17) = 37
    expect(courseHandicap(30, 140)).toBe(37)
  })

  it('handles fractional index', () => {
    // 12.4 index, 130 slope → round(12.4 * 130 / 113) = round(14.27) = 14
    expect(courseHandicap(12.4, 130)).toBe(14)
  })
})

describe('playingHandicap', () => {
  it('subtracts lowest from course handicap', () => {
    expect(playingHandicap(18, 10)).toBe(8)
  })

  it('returns 0 for the lowest player', () => {
    expect(playingHandicap(10, 10)).toBe(0)
  })

  it('never returns negative', () => {
    expect(playingHandicap(5, 10)).toBe(0)
  })

  it('handles scratch vs high handicap', () => {
    expect(playingHandicap(25, 0)).toBe(25)
  })
})

describe('strokeAllocation', () => {
  // Standard 18-hole layout with stroke indexes 1-18
  const holes: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 3,
    handicap: i + 1, // Stroke index = hole number for simplicity
  }))

  it('returns empty for 0 handicap', () => {
    expect(strokeAllocation(0, holes)).toEqual([])
  })

  it('allocates strokes to hardest holes', () => {
    const result = strokeAllocation(3, holes)
    expect(result).toEqual([1, 2, 3]) // Holes with stroke index 1, 2, 3
  })

  it('allocates all 18 for handicap 18', () => {
    const result = strokeAllocation(18, holes)
    expect(result).toHaveLength(18)
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  })

  it('allocates double strokes for handicap > 18', () => {
    // Handicap 20: all 18 holes get 1 stroke, hardest 2 get a second
    const result = strokeAllocation(20, holes)
    // Holes 1 and 2 appear twice (double stroke), rest once
    expect(result).toHaveLength(20)
    expect(result.filter(h => h === 1)).toHaveLength(2)
    expect(result.filter(h => h === 2)).toHaveLength(2)
    expect(result.filter(h => h === 3)).toHaveLength(1)
  })

  it('handles non-sequential stroke indexes', () => {
    const shuffledHoles: HoleInfo[] = [
      { number: 1, par: 4, handicap: 7 },
      { number: 2, par: 5, handicap: 1 },
      { number: 3, par: 3, handicap: 15 },
      { number: 4, par: 4, handicap: 3 },
    ]
    // Handicap 2: should get strokes on holes with stroke index 1 and 3
    // That's hole 2 (SI=1) and hole 4 (SI=3)
    const result = strokeAllocation(2, shuffledHoles)
    expect(result).toEqual([2, 4])
  })
})

describe('receivesStroke', () => {
  it('returns true when stroke index <= handicap', () => {
    expect(receivesStroke(10, 5)).toBe(true)
    expect(receivesStroke(10, 10)).toBe(true)
  })

  it('returns false when stroke index > handicap', () => {
    expect(receivesStroke(10, 11)).toBe(false)
  })

  it('returns false for 0 handicap', () => {
    expect(receivesStroke(0, 1)).toBe(false)
  })
})

describe('receivesDoubleStroke', () => {
  it('returns false for handicap <= 18', () => {
    expect(receivesDoubleStroke(18, 1)).toBe(false)
    expect(receivesDoubleStroke(10, 1)).toBe(false)
  })

  it('returns true for hardest holes when handicap > 18', () => {
    // Handicap 20: double stroke on stroke index 1 and 2
    expect(receivesDoubleStroke(20, 1)).toBe(true)
    expect(receivesDoubleStroke(20, 2)).toBe(true)
    expect(receivesDoubleStroke(20, 3)).toBe(false)
  })
})

// ===== New configurable handicap tests =====

describe('adjustedHandicap', () => {
  it('applies 80% to course handicap (rounds UP)', () => {
    // 18 * 80/100 = 14.4 → ceil = 15
    expect(adjustedHandicap(18, 80)).toBe(15)
  })

  it('100% returns unchanged', () => {
    expect(adjustedHandicap(18, 100)).toBe(18)
  })

  it('handles 0%', () => {
    expect(adjustedHandicap(18, 0)).toBe(0)
  })

  it('rounds UP (ROUNDUP / ceil)', () => {
    // 15 * 80/100 = 12.0 → 12
    expect(adjustedHandicap(15, 80)).toBe(12)
    // 11 * 80/100 = 8.8 → 9
    expect(adjustedHandicap(11, 80)).toBe(9)
    // 5 * 80/100 = 4.0 → 4
    expect(adjustedHandicap(5, 80)).toBe(4)
    // 6 * 80/100 = 4.8 → 5 (rounds UP, not to nearest)
    expect(adjustedHandicap(6, 80)).toBe(5)
    // 9 * 80/100 = 7.2 → 8 (rounds UP)
    expect(adjustedHandicap(9, 80)).toBe(8)
  })
})

describe('teamHandicap', () => {
  it('calculates foursomes-style 60/40', () => {
    // low=10, high=18 → round(10*60/100 + 18*40/100) = round(6 + 7.2) = round(13.2) = 13
    expect(teamHandicap([10, 18], 60, 40)).toBe(13)
  })

  it('calculates scramble-style 35/15', () => {
    // low=10, high=18 → round(10*35/100 + 18*15/100) = round(3.5 + 2.7) = round(6.2) = 6
    expect(teamHandicap([10, 18], 35, 15)).toBe(6)
  })

  it('sorts players regardless of input order', () => {
    expect(teamHandicap([18, 10], 60, 40)).toBe(teamHandicap([10, 18], 60, 40))
  })

  it('handles single player', () => {
    expect(teamHandicap([10], 60, 40)).toBe(6) // round(10*60/100) = 6
  })

  it('handles equal handicaps', () => {
    // low=15, high=15 → round(15*60/100 + 15*40/100) = round(9 + 6) = 15
    expect(teamHandicap([15, 15], 60, 40)).toBe(15)
  })

  it('handles empty array', () => {
    expect(teamHandicap([], 60, 40)).toBe(0)
  })
})

describe('computeMatchHandicaps', () => {
  describe('individual formats', () => {
    it('user example: hdcps 4,8,12,16 at 100% → playing 0,4,8,12', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 4, side: 1 },
        { tripPlayerId: 'b', courseHdcp: 8, side: 1 },
        { tripPlayerId: 'c', courseHdcp: 12, side: 2 },
        { tripPlayerId: 'd', courseHdcp: 16, side: 2 },
      ]
      const results = computeMatchHandicaps(players, 'FOURBALL', null) // null = 100% default
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(4)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(8)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(12)
    })

    it('applies 80% then off the low for fourball', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 5, side: 1 },   // adj = 4
        { tripPlayerId: 'b', courseHdcp: 10, side: 1 },  // adj = 8
        { tripPlayerId: 'c', courseHdcp: 15, side: 2 },  // adj = 12
        { tripPlayerId: 'd', courseHdcp: 20, side: 2 },  // adj = 16
      ]
      const config: HandicapConfig = { percentage: 80, offTheLow: true }
      const results = computeMatchHandicaps(players, 'FOURBALL', config)
      // lowest adjusted = 4
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(4)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(8)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(12)
    })

    it('applies 80% then off the low for singles', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 10, side: 1 },  // adj = 8
        { tripPlayerId: 'b', courseHdcp: 20, side: 2 },  // adj = 16
      ]
      const config: HandicapConfig = { percentage: 80, offTheLow: true }
      const results = computeMatchHandicaps(players, 'SINGLES', config)
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(8)
    })

    it('preserves courseHandicap in results', () => {
      const players = [{ tripPlayerId: 'a', courseHdcp: 18, side: 1 }]
      const config: HandicapConfig = { percentage: 80, offTheLow: true }
      const results = computeMatchHandicaps(players, 'SINGLES', config)
      expect(results[0].courseHandicap).toBe(18)
    })
  })

  describe('team formats', () => {
    it('foursomes: 80% then 60/40 split, off the low team', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 5, side: 1 },   // adj = 4
        { tripPlayerId: 'b', courseHdcp: 15, side: 1 },  // adj = 12
        { tripPlayerId: 'c', courseHdcp: 10, side: 2 },  // adj = 8
        { tripPlayerId: 'd', courseHdcp: 20, side: 2 },  // adj = 16
      ]
      const config: HandicapConfig = {
        percentage: 80,
        offTheLow: true,
        teamCombos: { FOURSOMES: { lowPct: 60, highPct: 40 } },
      }
      const results = computeMatchHandicaps(players, 'FOURSOMES', config)
      // Side 1: low=4, high=12 → round(4*0.6 + 12*0.4) = round(2.4 + 4.8) = round(7.2) = 7
      // Side 2: low=8, high=16 → round(8*0.6 + 16*0.4) = round(4.8 + 6.4) = round(11.2) = 11
      // lowest team = 7
      // Side 1 playing = 0, Side 2 playing = 4
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(4)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(4)
    })

    it('scramble: 80% then 35/15 split, off the low team', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 5, side: 1 },   // adj = 4
        { tripPlayerId: 'b', courseHdcp: 15, side: 1 },  // adj = 12
        { tripPlayerId: 'c', courseHdcp: 10, side: 2 },  // adj = 8
        { tripPlayerId: 'd', courseHdcp: 20, side: 2 },  // adj = 16
      ]
      const config: HandicapConfig = {
        percentage: 80,
        offTheLow: true,
        teamCombos: { SCRAMBLE: { lowPct: 35, highPct: 15 } },
      }
      const results = computeMatchHandicaps(players, 'SCRAMBLE', config)
      // Side 1: low=4, high=12 → round(4*0.35 + 12*0.15) = round(1.4 + 1.8) = round(3.2) = 3
      // Side 2: low=8, high=16 → round(8*0.35 + 16*0.15) = round(2.8 + 2.4) = round(5.2) = 5
      // lowest team = 3
      // Side 1 playing = 0, Side 2 playing = 2
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(2)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(2)
    })

    it('both players on same side get same playing handicap', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 10, side: 1 },
        { tripPlayerId: 'b', courseHdcp: 20, side: 1 },
        { tripPlayerId: 'c', courseHdcp: 10, side: 2 },
        { tripPlayerId: 'd', courseHdcp: 20, side: 2 },
      ]
      const config: HandicapConfig = {
        percentage: 100,
        offTheLow: true,
        teamCombos: { FOURSOMES: { lowPct: 60, highPct: 40 } },
      }
      const results = computeMatchHandicaps(players, 'FOURSOMES', config)
      const aHdcp = results.find(r => r.tripPlayerId === 'a')!.playingHandicap
      const bHdcp = results.find(r => r.tripPlayerId === 'b')!.playingHandicap
      expect(aHdcp).toBe(bHdcp)
    })

    it('falls back to individual logic when no team combo configured', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 10, side: 1 },
        { tripPlayerId: 'b', courseHdcp: 20, side: 1 },
        { tripPlayerId: 'c', courseHdcp: 15, side: 2 },
        { tripPlayerId: 'd', courseHdcp: 25, side: 2 },
      ]
      // Config with percentage but no team combo for FOURSOMES
      const config: HandicapConfig = { percentage: 80, offTheLow: true }
      const results = computeMatchHandicaps(players, 'FOURSOMES', config)
      // Falls back to individual: each player gets ceil(80%), then off the low
      // adj: ceil(8)=8, ceil(16)=16, ceil(12)=12, ceil(20)=20 → lowest = 8 → playing: 0, 8, 4, 12
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(8)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(4)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(12)
    })
  })

  describe('maxHandicap cap', () => {
    it('caps adjusted handicap at maxHandicap for individual formats', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 4, side: 1 },   // adj = ceil(3.2) = 4
        { tripPlayerId: 'b', courseHdcp: 27, side: 2 },   // adj = ceil(21.6) = 22 → capped to 20
      ]
      const config: HandicapConfig = { percentage: 80, offTheLow: true, maxHandicap: 20 }
      const results = computeMatchHandicaps(players, 'SINGLES', config)
      // After cap: a=4, b=20. Off the low: a=0, b=16
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(16)
    })

    it('caps adjusted handicap at maxHandicap for team formats', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 9, side: 1 },   // adj = ceil(7.2) = 8
        { tripPlayerId: 'b', courseHdcp: 26, side: 1 },   // adj = ceil(20.8) = 21 → capped to 20
        { tripPlayerId: 'c', courseHdcp: 12, side: 2 },   // adj = ceil(9.6) = 10
        { tripPlayerId: 'd', courseHdcp: 27, side: 2 },   // adj = ceil(21.6) = 22 → capped to 20
      ]
      const config: HandicapConfig = {
        percentage: 80, offTheLow: true, maxHandicap: 20,
        teamCombos: { FOURSOMES: { lowPct: 60, highPct: 40 } },
      }
      const results = computeMatchHandicaps(players, 'FOURSOMES', config)
      // Side 1: [8, 20] → round(8*0.6 + 20*0.4) = round(4.8 + 8) = round(12.8) = 13
      // Side 2: [10, 20] → round(10*0.6 + 20*0.4) = round(6 + 8) = round(14) = 14
      // Off the low: S1=0, S2=1
      expect(results.find(r => r.tripPlayerId === 'a')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(0)
      expect(results.find(r => r.tripPlayerId === 'c')!.playingHandicap).toBe(1)
      expect(results.find(r => r.tripPlayerId === 'd')!.playingHandicap).toBe(1)
    })

    it('no cap when maxHandicap is null', () => {
      const players = [
        { tripPlayerId: 'a', courseHdcp: 4, side: 1 },
        { tripPlayerId: 'b', courseHdcp: 27, side: 2 },
      ]
      const config: HandicapConfig = { percentage: 80, offTheLow: true, maxHandicap: null }
      const results = computeMatchHandicaps(players, 'SINGLES', config)
      // adj: ceil(3.2)=4, ceil(21.6)=22. Off the low: 0, 18
      expect(results.find(r => r.tripPlayerId === 'b')!.playingHandicap).toBe(18)
    })
  })
})

// ===== Skins handicap tests =====

describe('skinsHandicap', () => {
  it('R4 Donald Ross: Stephen Lear idx=8.5 → 8', () => {
    // slope=136, rating=71.1, par=72
    // ceil((8.5 * 136/113 + (71.1 - 72)) * 0.8) = ceil((10.212 - 0.9) * 0.8) = ceil(7.450) = 8
    expect(skinsHandicap(8.5, 136, 71.1, 72)).toBe(8)
  })

  it('R6 Arthur Hills: Stephen Lear idx=8.5 → 6', () => {
    // slope=132, rating=70.3, par=73
    // ceil((8.5 * 132/113 + (70.3 - 73)) * 0.8) = ceil((9.925 - 2.7) * 0.8) = ceil(5.780) = 6
    expect(skinsHandicap(8.5, 132, 70.3, 73)).toBe(6)
  })

  it('R4 all 16 players match expected values', () => {
    // R4 Donald Ross: slope=136, rating=71.1, par=72
    const s = 136, r = 71.1, p = 72
    expect(skinsHandicap(8.5, s, r, p)).toBe(8)   // Stephen Lear
    expect(skinsHandicap(3.5, s, r, p)).toBe(3)   // Joey Aiello
    expect(skinsHandicap(6.9, s, r, p)).toBe(6)   // Danny Morales
    expect(skinsHandicap(3.7, s, r, p)).toBe(3)   // Dave Meyer
    expect(skinsHandicap(9.7, s, r, p)).toBe(9)   // Alex Paxton
    expect(skinsHandicap(9.8, s, r, p)).toBe(9)   // Dylan Plachta
    expect(skinsHandicap(19.9, s, r, p)).toBe(19)  // Joe Spencer
    expect(skinsHandicap(21.0, s, r, p)).toBe(20)  // Ryan Hubona (capped)
    expect(skinsHandicap(11.7, s, r, p)).toBe(11)  // Tom Bostwick
    expect(skinsHandicap(4.6, s, r, p)).toBe(4)   // Ben Hammel
    expect(skinsHandicap(5.8, s, r, p)).toBe(5)   // Zach Lear
    expect(skinsHandicap(4.9, s, r, p)).toBe(4)   // Joe Ways
    expect(skinsHandicap(9.5, s, r, p)).toBe(9)   // Maxwell Huntley
    expect(skinsHandicap(12.8, s, r, p)).toBe(12)  // Eric Barkovich
    expect(skinsHandicap(17.7, s, r, p)).toBe(17)  // Kip Owen
    expect(skinsHandicap(21.6, s, r, p)).toBe(20)  // Zack Stitt (capped)
  })

  it('caps at maxHdcp (default 20)', () => {
    expect(skinsHandicap(30, 136, 71.1, 72)).toBe(20)
  })

  it('floors at 0 for low index on tough course', () => {
    // Very low index on a course where rating << par
    expect(skinsHandicap(0, 100, 65, 72)).toBe(0)
  })

  it('handles scratch golfer', () => {
    // index=0, rating=72, par=72 → ceil(0 * 0.8) = 0
    expect(skinsHandicap(0, 113, 72, 72)).toBe(0)
  })
})

describe('teamSkinsHandicap', () => {
  it('foursomes 60/40 split', () => {
    // low=6, high=9 → round(6*0.6 + 9*0.4) = round(3.6 + 3.6) = round(7.2) = 7
    expect(teamSkinsHandicap([6, 9], 60, 40)).toBe(7)
  })

  it('scramble 35/15 split', () => {
    // low=6, high=9 → round(6*0.35 + 9*0.15) = round(2.1 + 1.35) = round(3.45) = 3
    expect(teamSkinsHandicap([6, 9], 35, 15)).toBe(3)
  })

  it('sorts regardless of input order', () => {
    expect(teamSkinsHandicap([9, 6], 60, 40)).toBe(teamSkinsHandicap([6, 9], 60, 40))
  })

  it('handles single player', () => {
    expect(teamSkinsHandicap([10], 60, 40)).toBe(6) // round(10*0.6) = 6
  })

  it('handles empty array', () => {
    expect(teamSkinsHandicap([], 60, 40)).toBe(0)
  })
})
