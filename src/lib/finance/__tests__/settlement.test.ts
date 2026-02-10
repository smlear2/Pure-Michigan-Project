import { describe, it, expect } from 'vitest'
import { simplifyDebts } from '../settlement'

describe('simplifyDebts', () => {
  it('returns empty array when all balances are zero', () => {
    const result = simplifyDebts([
      { tripPlayerId: 'a', name: 'Alice', netBalance: 0 },
      { tripPlayerId: 'b', name: 'Bob', netBalance: 0 },
    ])
    expect(result).toEqual([])
  })

  it('handles simple two-player debt', () => {
    const result = simplifyDebts([
      { tripPlayerId: 'a', name: 'Alice', netBalance: 50 },
      { tripPlayerId: 'b', name: 'Bob', netBalance: -50 },
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      fromPlayerId: 'b', fromName: 'Bob',
      toPlayerId: 'a', toName: 'Alice',
      amount: 50,
    })
  })

  it('simplifies three-player circular debt to 2 transfers', () => {
    // A is owed 30, B is owed 10, C owes 40
    const result = simplifyDebts([
      { tripPlayerId: 'a', name: 'Alice', netBalance: 30 },
      { tripPlayerId: 'b', name: 'Bob', netBalance: 10 },
      { tripPlayerId: 'c', name: 'Charlie', netBalance: -40 },
    ])
    expect(result).toHaveLength(2)
    const totalTransferred = result.reduce((s, t) => s + t.amount, 0)
    expect(totalTransferred).toBe(40)
  })

  it('handles 16 players with mixed balances', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      tripPlayerId: `p${i}`,
      name: `Player ${i}`,
      netBalance: i < 8 ? 25 : -25, // 8 owed $25, 8 owe $25
    }))
    const result = simplifyDebts(players)
    // Should produce at most 15 transfers
    expect(result.length).toBeLessThanOrEqual(15)
    // All amounts should be positive
    result.forEach(t => expect(t.amount).toBeGreaterThan(0))
  })

  it('rounds amounts to 2 decimal places', () => {
    const result = simplifyDebts([
      { tripPlayerId: 'a', name: 'Alice', netBalance: 33.333 },
      { tripPlayerId: 'b', name: 'Bob', netBalance: -33.333 },
    ])
    expect(result[0].amount).toBe(33.33)
  })

  it('ignores tiny balances under $0.01', () => {
    const result = simplifyDebts([
      { tripPlayerId: 'a', name: 'Alice', netBalance: 0.005 },
      { tripPlayerId: 'b', name: 'Bob', netBalance: -0.005 },
    ])
    expect(result).toEqual([])
  })
})
