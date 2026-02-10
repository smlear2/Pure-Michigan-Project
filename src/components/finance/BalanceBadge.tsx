'use client'

import { formatCurrency } from '@/lib/utils'

interface BalanceBadgeProps {
  amount: number
  size?: 'sm' | 'md'
}

export default function BalanceBadge({ amount, size = 'md' }: BalanceBadgeProps) {
  const isPositive = amount > 0.005
  const isNegative = amount < -0.005
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  if (!isPositive && !isNegative) {
    return (
      <span className={`${textSize} text-slate-500`} style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
        $0
      </span>
    )
  }

  return (
    <span
      className={`${textSize} font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
      style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
    >
      {isPositive ? '+' : ''}{formatCurrency(amount)}
    </span>
  )
}
