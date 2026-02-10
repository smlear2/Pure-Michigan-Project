import { z } from 'zod'

const expenseSplitSchema = z.object({
  tripPlayerId: z.string().min(1),
  amount: z.number().min(0),
})

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().min(0.01, 'Amount must be positive'),
  date: z.string().optional(),
  paidById: z.string().min(1, 'Payer is required'),
  splitType: z.enum(['EVEN_ALL', 'EVEN_SOME', 'CUSTOM', 'FULL_PAYBACK']),
  category: z.string().max(100).optional().or(z.literal('')),
  splitPlayerIds: z.array(z.string()).optional(),
  customSplits: z.array(expenseSplitSchema).optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
