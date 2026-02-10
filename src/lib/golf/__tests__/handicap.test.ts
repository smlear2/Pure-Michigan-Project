import { describe, it, expect } from 'vitest'
import {
  courseHandicap,
  playingHandicap,
  strokeAllocation,
  receivesStroke,
  receivesDoubleStroke,
  HoleInfo,
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
