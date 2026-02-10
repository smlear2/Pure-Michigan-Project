import { z } from 'zod'

export const createPaymentItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  amount: z.number().min(0.01, 'Amount must be positive'),
  dueDate: z.string().optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).default(0),
})

export const updatePaymentItemSchema = createPaymentItemSchema.partial()

export const upsertPaymentRecordSchema = z.object({
  tripPlayerId: z.string().min(1, 'Player is required'),
  amountPaid: z.number().min(0),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID']),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const bulkUpdatePaymentRecordsSchema = z.object({
  records: z.array(upsertPaymentRecordSchema).min(1),
})

export type CreatePaymentItemInput = z.infer<typeof createPaymentItemSchema>
export type UpdatePaymentItemInput = z.infer<typeof updatePaymentItemSchema>
export type UpsertPaymentRecordInput = z.infer<typeof upsertPaymentRecordSchema>
