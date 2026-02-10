import { describe, it, expect } from 'vitest'
import { calculateExpenseSplits } from '../expense-splits'

const allPlayers = ['p1', 'p2', 'p3', 'p4']

describe('calculateExpenseSplits', () => {
  it('EVEN_ALL splits equally among all players', () => {
    const result = calculateExpenseSplits(100, 'EVEN_ALL', allPlayers, 'p1')
    expect(result).toHaveLength(4)
    result.forEach(r => expect(r.amount).toBe(25))
    expect(result.find(r => r.tripPlayerId === 'p1')?.isPayer).toBe(true)
    expect(result.find(r => r.tripPlayerId === 'p2')?.isPayer).toBe(false)
  })

  it('EVEN_SOME splits among selected players', () => {
    const result = calculateExpenseSplits(100, 'EVEN_SOME', allPlayers, 'p1', ['p1', 'p2'])
    expect(result).toHaveLength(2)
    result.forEach(r => expect(r.amount).toBe(50))
  })

  it('EVEN_SOME includes payer even if not in selection', () => {
    const result = calculateExpenseSplits(90, 'EVEN_SOME', allPlayers, 'p1', ['p2', 'p3'])
    expect(result).toHaveLength(3) // payer auto-included
    result.forEach(r => expect(r.amount).toBe(30))
  })

  it('CUSTOM uses provided amounts', () => {
    const custom = [
      { tripPlayerId: 'p1', amount: 10 },
      { tripPlayerId: 'p2', amount: 40 },
      { tripPlayerId: 'p3', amount: 50 },
    ]
    const result = calculateExpenseSplits(100, 'CUSTOM', allPlayers, 'p1', undefined, custom)
    expect(result).toHaveLength(3)
    expect(result.find(r => r.tripPlayerId === 'p1')?.amount).toBe(10)
    expect(result.find(r => r.tripPlayerId === 'p2')?.amount).toBe(40)
    expect(result.find(r => r.tripPlayerId === 'p3')?.amount).toBe(50)
  })

  it('FULL_PAYBACK assigns full amount to borrower', () => {
    const result = calculateExpenseSplits(200, 'FULL_PAYBACK', allPlayers, 'p1', ['p2'])
    expect(result).toHaveLength(2)
    expect(result.find(r => r.tripPlayerId === 'p1')?.amount).toBe(0)
    expect(result.find(r => r.tripPlayerId === 'p1')?.isPayer).toBe(true)
    expect(result.find(r => r.tripPlayerId === 'p2')?.amount).toBe(200)
    expect(result.find(r => r.tripPlayerId === 'p2')?.isPayer).toBe(false)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateExpenseSplits(100, 'EVEN_ALL', ['p1', 'p2', 'p3'], 'p1')
    result.forEach(r => {
      const decimals = r.amount.toString().split('.')[1]?.length ?? 0
      expect(decimals).toBeLessThanOrEqual(2)
    })
  })
})
