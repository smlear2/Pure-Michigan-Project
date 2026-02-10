import { describe, it, expect } from 'vitest'
import { bestBall, holeWinner, computeMatchState, HoleResult } from '../match-play'

describe('bestBall', () => {
  it('returns lowest score', () => {
    expect(bestBall([4, 5, 3, 6])).toBe(3)
  })

  it('handles nulls (missing scores)', () => {
    expect(bestBall([null, 5, null, 4])).toBe(4)
  })

  it('returns null for all nulls', () => {
    expect(bestBall([null, null])).toBeNull()
  })

  it('returns single score', () => {
    expect(bestBall([5])).toBe(5)
  })
})

describe('holeWinner', () => {
  it('side1 wins with lower score', () => {
    expect(holeWinner(3, 4)).toBe('SIDE1')
  })

  it('side2 wins with lower score', () => {
    expect(holeWinner(5, 4)).toBe('SIDE2')
  })

  it('halved on equal scores', () => {
    expect(holeWinner(4, 4)).toBe('HALVED')
  })

  it('returns null if side1 has no score', () => {
    expect(holeWinner(null, 4)).toBeNull()
  })

  it('returns null if side2 has no score', () => {
    expect(holeWinner(3, null)).toBeNull()
  })
})

describe('computeMatchState', () => {
  const WIN = 1
  const HALF = 0.5

  it('tracks a match that goes to 18 — side1 wins 1UP', () => {
    // Side1 wins holes 1, 5, 10. Side2 wins holes 3, 7. Rest halved.
    const results: HoleResult[] = [
      'SIDE1', 'HALVED', 'SIDE2', 'HALVED', 'SIDE1',
      'HALVED', 'SIDE2', 'HALVED', 'HALVED', 'SIDE1',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED',
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(true)
    expect(state.side1Lead).toBe(1)
    expect(state.resultText).toBe('1UP')
    expect(state.side1Points).toBe(1)
    expect(state.side2Points).toBe(0)
    expect(state.holesPlayed).toBe(18)
  })

  it('tracks a halved match', () => {
    const results: HoleResult[] = [
      'SIDE1', 'SIDE2', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED',
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(true)
    expect(state.side1Lead).toBe(0)
    expect(state.resultText).toBe('Halved')
    expect(state.side1Points).toBe(0.5)
    expect(state.side2Points).toBe(0.5)
  })

  it('detects closeout — 3&2', () => {
    // Side1 wins first 3 holes, all halved after
    const results: HoleResult[] = [
      'SIDE1', 'SIDE1', 'SIDE1', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', // Hole 16: 3 up with 2 remaining → 3&2
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(true)
    expect(state.resultText).toBe('3&2')
    expect(state.side1Points).toBe(1)
    expect(state.side2Points).toBe(0)
    expect(state.holesPlayed).toBe(16)
  })

  it('detects closeout — 5&4 for side2', () => {
    // Side2 dominates early
    const results: HoleResult[] = [
      'SIDE2', 'SIDE2', 'SIDE2', 'SIDE2', 'SIDE2',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', // Hole 14: 5 down with 4 remaining → 5&4
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(true)
    expect(state.resultText).toBe('5&4')
    expect(state.side1Points).toBe(0)
    expect(state.side2Points).toBe(1)
    expect(state.holesPlayed).toBe(14)
  })

  it('detects dormie', () => {
    // After 15 holes, side1 is 3 up (3 remaining = dormie)
    const results: HoleResult[] = [
      'SIDE1', 'SIDE1', 'SIDE1', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
      'HALVED', 'HALVED', 'HALVED', 'HALVED', 'HALVED',
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(false)
    expect(state.isDormie).toBe(true)
    expect(state.side1Lead).toBe(3)
    expect(state.holesRemaining).toBe(3)
    expect(state.displayText).toContain('3 UP')
    expect(state.displayText).toContain('Dormie')
  })

  it('handles in-progress match', () => {
    const results: HoleResult[] = [
      'SIDE1', 'HALVED', 'SIDE2', null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null,
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(false)
    expect(state.holesPlayed).toBe(3)
    expect(state.holesRemaining).toBe(15)
    expect(state.displayText).toBe('AS')
  })

  it('side1 up after a few holes', () => {
    const results: HoleResult[] = [
      'SIDE1', 'SIDE1', 'HALVED', 'SIDE2', null,
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null,
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(false)
    expect(state.side1Lead).toBe(1)
    expect(state.holesPlayed).toBe(4)
    expect(state.displayText).toBe('1 UP')
  })

  it('handles empty results (no holes played)', () => {
    const results: HoleResult[] = Array(18).fill(null)
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(false)
    expect(state.holesPlayed).toBe(0)
    expect(state.holesRemaining).toBe(18)
    expect(state.displayText).toBe('AS')
  })

  it('10&8 closeout (maximum possible)', () => {
    // Side1 wins every hole through 10
    const results: HoleResult[] = [
      'SIDE1', 'SIDE1', 'SIDE1', 'SIDE1', 'SIDE1',
      'SIDE1', 'SIDE1', 'SIDE1', 'SIDE1', 'SIDE1',
    ]
    const state = computeMatchState(results, 18, WIN, HALF)
    expect(state.isComplete).toBe(true)
    expect(state.resultText).toBe('10&8')
    expect(state.holesPlayed).toBe(10)
  })
})
