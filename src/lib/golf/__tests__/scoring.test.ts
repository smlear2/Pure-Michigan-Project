import { describe, it, expect } from 'vitest'
import { applyMaxScore, netScore } from '../scoring'

describe('applyMaxScore', () => {
  it('caps at par + maxScore', () => {
    // Par 4, maxScore 3 (triple bogey cap) = cap at 7
    expect(applyMaxScore(9, 4, 3)).toBe(7)
  })

  it('does not change scores under cap', () => {
    expect(applyMaxScore(5, 4, 3)).toBe(5)
  })

  it('does not change scores at exactly cap', () => {
    expect(applyMaxScore(7, 4, 3)).toBe(7)
  })

  it('returns gross when maxScore is null (no cap)', () => {
    expect(applyMaxScore(12, 4, null)).toBe(12)
  })

  it('works with par 3', () => {
    // Par 3, maxScore 3 = cap at 6 (triple bogey)
    expect(applyMaxScore(8, 3, 3)).toBe(6)
  })

  it('works with par 5', () => {
    // Par 5, maxScore 2 = cap at 7 (double bogey)
    expect(applyMaxScore(9, 5, 2)).toBe(7)
  })

  it('works with maxScore 1 (bogey cap)', () => {
    expect(applyMaxScore(6, 4, 1)).toBe(5)
  })
})

describe('netScore', () => {
  it('subtracts 1 stroke when receiving', () => {
    expect(netScore(5, 1)).toBe(4)
  })

  it('returns gross when no stroke received', () => {
    expect(netScore(5, 0)).toBe(5)
  })

  it('subtracts 2 strokes for double stroke', () => {
    expect(netScore(7, 2)).toBe(5)
  })
})
