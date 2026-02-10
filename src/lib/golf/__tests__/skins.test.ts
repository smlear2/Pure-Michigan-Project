import { describe, it, expect } from 'vitest'
import { calculateSkins, HoleSkinScore } from '../skins'

describe('calculateSkins', () => {
  const fourPlayers = [
    { playerId: 'p1', netScore: 0 },
    { playerId: 'p2', netScore: 0 },
    { playerId: 'p3', netScore: 0 },
    { playerId: 'p4', netScore: 0 },
  ]

  it('awards skin to lowest unique net score', () => {
    const holes: HoleSkinScore[] = [
      {
        holeNumber: 1,
        playerScores: [
          { playerId: 'p1', netScore: 3 },
          { playerId: 'p2', netScore: 4 },
          { playerId: 'p3', netScore: 5 },
          { playerId: 'p4', netScore: 4 },
        ],
      },
    ]
    const result = calculateSkins(holes, 20, 4, false)
    expect(result.holes[0].winnerId).toBe('p1')
    expect(result.skinsAwarded).toBe(1)
    expect(result.totalPot).toBe(80)
    expect(result.skinValue).toBe(80)
  })

  it('no skin when lowest is tied', () => {
    const holes: HoleSkinScore[] = [
      {
        holeNumber: 1,
        playerScores: [
          { playerId: 'p1', netScore: 3 },
          { playerId: 'p2', netScore: 3 },
          { playerId: 'p3', netScore: 5 },
          { playerId: 'p4', netScore: 4 },
        ],
      },
    ]
    const result = calculateSkins(holes, 20, 4, false)
    expect(result.holes[0].winnerId).toBeNull()
    expect(result.skinsAwarded).toBe(0)
    expect(result.skinValue).toBe(0)
  })

  it('variable skin value across multiple holes', () => {
    const holes: HoleSkinScore[] = [
      {
        holeNumber: 1,
        playerScores: [
          { playerId: 'p1', netScore: 3 },
          { playerId: 'p2', netScore: 4 },
          { playerId: 'p3', netScore: 5 },
          { playerId: 'p4', netScore: 4 },
        ],
      },
      {
        holeNumber: 2,
        playerScores: [
          { playerId: 'p1', netScore: 4 },
          { playerId: 'p2', netScore: 4 },
          { playerId: 'p3', netScore: 5 },
          { playerId: 'p4', netScore: 4 },
        ],
      },
      {
        holeNumber: 3,
        playerScores: [
          { playerId: 'p1', netScore: 5 },
          { playerId: 'p2', netScore: 4 },
          { playerId: 'p3', netScore: 3 },
          { playerId: 'p4', netScore: 5 },
        ],
      },
    ]
    // Pot = 20 * 4 = 80. 2 skins awarded. Skin value = 40.
    const result = calculateSkins(holes, 20, 4, false)
    expect(result.skinsAwarded).toBe(2)
    expect(result.skinValue).toBe(40)
    expect(result.holes[0].winnerId).toBe('p1')
    expect(result.holes[1].winnerId).toBeNull()
    expect(result.holes[2].winnerId).toBe('p3')

    // Player totals
    const p1Total = result.playerTotals.find(p => p.playerId === 'p1')
    expect(p1Total?.skinsWon).toBe(1)
    expect(p1Total?.moneyWon).toBe(40)
  })

  it('carryover accumulates tied holes', () => {
    const holes: HoleSkinScore[] = [
      {
        holeNumber: 1,
        playerScores: [
          { playerId: 'p1', netScore: 4 },
          { playerId: 'p2', netScore: 4 },
        ],
      },
      {
        holeNumber: 2,
        playerScores: [
          { playerId: 'p1', netScore: 4 },
          { playerId: 'p2', netScore: 4 },
        ],
      },
      {
        holeNumber: 3,
        playerScores: [
          { playerId: 'p1', netScore: 3 },
          { playerId: 'p2', netScore: 5 },
        ],
      },
    ]
    // With carryover: holes 1 & 2 carry over → hole 3 wins 3 skins worth
    const result = calculateSkins(holes, 10, 2, true)
    expect(result.totalPot).toBe(20)
    expect(result.skinsAwarded).toBe(3) // 1 + 2 carryover
    expect(result.skinValue).toBeCloseTo(20 / 3)

    const p1 = result.playerTotals.find(p => p.playerId === 'p1')
    expect(p1?.skinsWon).toBe(3)
    expect(p1?.moneyWon).toBeCloseTo(20) // Wins entire pot
  })

  it('no carryover — tied holes are simply lost', () => {
    const holes: HoleSkinScore[] = [
      {
        holeNumber: 1,
        playerScores: [
          { playerId: 'p1', netScore: 4 },
          { playerId: 'p2', netScore: 4 },
        ],
      },
      {
        holeNumber: 2,
        playerScores: [
          { playerId: 'p1', netScore: 3 },
          { playerId: 'p2', netScore: 5 },
        ],
      },
    ]
    // Without carryover: hole 1 dead, hole 2 is 1 skin
    const result = calculateSkins(holes, 10, 2, false)
    expect(result.skinsAwarded).toBe(1)
    expect(result.skinValue).toBe(20) // Entire pot for 1 skin
  })

  it('handles empty holes', () => {
    const result = calculateSkins([], 20, 4, false)
    expect(result.skinsAwarded).toBe(0)
    expect(result.skinValue).toBe(0)
    expect(result.totalPot).toBe(80)
  })

  it('handles hole with no scores', () => {
    const holes: HoleSkinScore[] = [
      { holeNumber: 1, playerScores: [] },
    ]
    const result = calculateSkins(holes, 20, 4, false)
    expect(result.holes[0].winnerId).toBeNull()
  })

  it('full 18-hole round with realistic scores', () => {
    // Simulate a realistic round: p1 wins 3 skins, p2 wins 2, ties on rest
    const holes: HoleSkinScore[] = Array.from({ length: 18 }, (_, i) => {
      const holeNum = i + 1
      if (holeNum <= 3) {
        // p1 wins these
        return {
          holeNumber: holeNum,
          playerScores: [
            { playerId: 'p1', netScore: 3 },
            { playerId: 'p2', netScore: 4 },
            { playerId: 'p3', netScore: 5 },
            { playerId: 'p4', netScore: 4 },
          ],
        }
      } else if (holeNum === 10 || holeNum === 15) {
        // p2 wins these
        return {
          holeNumber: holeNum,
          playerScores: [
            { playerId: 'p1', netScore: 5 },
            { playerId: 'p2', netScore: 3 },
            { playerId: 'p3', netScore: 4 },
            { playerId: 'p4', netScore: 5 },
          ],
        }
      } else {
        // Ties
        return {
          holeNumber: holeNum,
          playerScores: [
            { playerId: 'p1', netScore: 4 },
            { playerId: 'p2', netScore: 4 },
            { playerId: 'p3', netScore: 4 },
            { playerId: 'p4', netScore: 4 },
          ],
        }
      }
    })

    const result = calculateSkins(holes, 20, 4, false)
    expect(result.totalPot).toBe(80)
    expect(result.skinsAwarded).toBe(5)
    expect(result.skinValue).toBe(16)

    const p1 = result.playerTotals.find(p => p.playerId === 'p1')
    expect(p1?.skinsWon).toBe(3)
    expect(p1?.moneyWon).toBe(48)

    const p2 = result.playerTotals.find(p => p.playerId === 'p2')
    expect(p2?.skinsWon).toBe(2)
    expect(p2?.moneyWon).toBe(32)
  })
})
