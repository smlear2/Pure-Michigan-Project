import { z } from 'zod'

export const createRoundSchema = z.object({
  teeId: z.string().min(1, 'Tee is required'),
  roundNumber: z.number().int().min(1),
  name: z.string().max(200).optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
  format: z.enum(['FOURBALL', 'FOURSOMES', 'MODIFIED_ALT_SHOT', 'SCRAMBLE', 'SHAMBLE', 'SINGLES', 'STROKEPLAY']),
  skinsEnabled: z.boolean().default(true),
})

export const updateRoundSchema = createRoundSchema.partial().extend({
  verificationStatus: z.enum(['UNVERIFIED', 'VERIFIED', 'LOCKED']).optional(),
})
