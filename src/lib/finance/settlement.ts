// ===========================================
// DEBT SETTLEMENT
// Pure functions — no DB dependency
// ===========================================

export interface PlayerBalance {
  tripPlayerId: string
  name: string
  netBalance: number // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  fromPlayerId: string
  fromName: string
  toPlayerId: string
  toName: string
  amount: number
}

/**
 * Simplify debts among players using a greedy algorithm.
 *
 * Given N players with net balances that should sum to ~0,
 * produces the minimum practical number of transfers.
 *
 * Algorithm: repeatedly match the largest creditor with the largest debtor.
 * Produces at most N-1 transfers.
 */
export function simplifyDebts(players: PlayerBalance[]): SimplifiedDebt[] {
  // Clone and filter out zero balances
  const creditors: PlayerBalance[] = []
  const debtors: PlayerBalance[] = []

  for (const p of players) {
    const balance = Math.round(p.netBalance * 100) / 100
    if (balance > 0.01) {
      creditors.push({ ...p, netBalance: balance })
    } else if (balance < -0.01) {
      debtors.push({ ...p, netBalance: balance })
    }
  }

  // Sort: creditors descending, debtors by most negative first
  creditors.sort((a, b) => b.netBalance - a.netBalance)
  debtors.sort((a, b) => a.netBalance - b.netBalance)

  const transfers: SimplifiedDebt[] = []

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]
    const debtor = debtors[0]

    const transfer = Math.min(creditor.netBalance, Math.abs(debtor.netBalance))
    const rounded = Math.round(transfer * 100) / 100

    if (rounded > 0) {
      transfers.push({
        fromPlayerId: debtor.tripPlayerId,
        fromName: debtor.name,
        toPlayerId: creditor.tripPlayerId,
        toName: creditor.name,
        amount: rounded,
      })
    }

    creditor.netBalance -= transfer
    debtor.netBalance += transfer

    // Remove settled players
    if (Math.abs(creditor.netBalance) < 0.01) creditors.shift()
    if (Math.abs(debtor.netBalance) < 0.01) debtors.shift()
  }

  return transfers
}
