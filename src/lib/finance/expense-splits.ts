// ===========================================
// EXPENSE SPLIT CALCULATIONS
// Pure functions — no DB dependency
// ===========================================

export interface SplitResult {
  tripPlayerId: string
  amount: number
  isPayer: boolean
}

/**
 * Calculate per-player split amounts for an expense.
 *
 * @param totalAmount - Total expense amount in dollars
 * @param splitType - How to divide the expense
 * @param allPlayerIds - All active trip player IDs (for EVEN_ALL)
 * @param paidById - TripPlayer ID of the person who paid
 * @param selectedPlayerIds - Player IDs for EVEN_SOME or FULL_PAYBACK
 * @param customAmounts - Per-player amounts for CUSTOM splits
 * @returns Array of split results for each involved player
 */
export function calculateExpenseSplits(
  totalAmount: number,
  splitType: 'EVEN_ALL' | 'EVEN_SOME' | 'CUSTOM' | 'FULL_PAYBACK',
  allPlayerIds: string[],
  paidById: string,
  selectedPlayerIds?: string[],
  customAmounts?: { tripPlayerId: string; amount: number }[],
): SplitResult[] {
  switch (splitType) {
    case 'EVEN_ALL': {
      const perPerson = Math.round((totalAmount / allPlayerIds.length) * 100) / 100
      return allPlayerIds.map(id => ({
        tripPlayerId: id,
        amount: perPerson,
        isPayer: id === paidById,
      }))
    }

    case 'EVEN_SOME': {
      const ids = selectedPlayerIds ?? []
      // Always include the payer in the split group
      const splitGroup = ids.includes(paidById) ? ids : [paidById, ...ids]
      const perPerson = Math.round((totalAmount / splitGroup.length) * 100) / 100
      return splitGroup.map(id => ({
        tripPlayerId: id,
        amount: perPerson,
        isPayer: id === paidById,
      }))
    }

    case 'CUSTOM': {
      const amounts = customAmounts ?? []
      return amounts.map(ca => ({
        tripPlayerId: ca.tripPlayerId,
        amount: Math.round(ca.amount * 100) / 100,
        isPayer: ca.tripPlayerId === paidById,
      }))
    }

    case 'FULL_PAYBACK': {
      const borrowerId = selectedPlayerIds?.[0]
      if (!borrowerId) return []
      return [
        { tripPlayerId: paidById, amount: 0, isPayer: true },
        { tripPlayerId: borrowerId, amount: totalAmount, isPayer: false },
      ]
    }

    default:
      return []
  }
}
