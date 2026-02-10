'use client'

import { formatCurrency, formatDateShort } from '@/lib/utils'

interface ExpenseSplit {
  id: string
  tripPlayerId: string
  amount: number
  isPayer: boolean
  tripPlayer: {
    id: string
    user: { name: string }
  }
}

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  splitType: string
  category: string | null
  paidBy: {
    id: string
    user: { name: string }
    team: { name: string; color: string } | null
  }
  splits: ExpenseSplit[]
}

interface ExpenseListProps {
  expenses: Expense[]
  tripId: string
  currentTripPlayerId: string | null
  isOrganizer: boolean
  onRefresh: () => void
}

const splitTypeLabels: Record<string, string> = {
  EVEN_ALL: 'Split evenly (all)',
  EVEN_SOME: 'Split evenly (some)',
  CUSTOM: 'Custom split',
  FULL_PAYBACK: 'Full payback',
}

export default function ExpenseList({ expenses, tripId, currentTripPlayerId, isOrganizer, onRefresh }: ExpenseListProps) {
  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return
    const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' })
    if (res.ok) onRefresh()
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500" style={monoFont}>No expenses yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {expenses.map(expense => {
        const canDelete = isOrganizer || expense.paidBy.id === currentTripPlayerId
        const nonPayerSplits = expense.splits.filter(s => !s.isPayer)

        return (
          <div key={expense.id} className="bg-slate-900/60 backdrop-blur rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-medium">{expense.description}</h4>
                  {expense.category && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400" style={monoFont}>
                      {expense.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1" style={monoFont}>
                  <span>{formatCurrency(expense.amount)}</span>
                  <span>&middot;</span>
                  <span>Paid by {expense.paidBy.user.name}</span>
                  <span>&middot;</span>
                  <span>{formatDateShort(expense.date)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5" style={monoFont}>
                  {splitTypeLabels[expense.splitType] || expense.splitType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-lg" style={monoFont}>
                  {formatCurrency(expense.amount)}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs ml-2"
                    style={monoFont}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Split breakdown */}
            <div className="px-4 py-2 border-t border-slate-800/50">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {nonPayerSplits.map(split => (
                  <div key={split.id} className="text-xs text-slate-500" style={monoFont}>
                    {split.tripPlayer.user.name}: {formatCurrency(split.amount)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
