import { z } from 'zod'

const teamComboSchema = z.object({
  lowPct: z.number().min(0).max(100),
  highPct: z.number().min(0).max(100),
})

const handicapConfigSchema = z.object({
  percentage: z.number().min(0).max(100),
  offTheLow: z.boolean().default(true),
  maxHandicap: z.number().min(0).optional().nullable(),
  teamCombos: z.record(z.string(), teamComboSchema).optional(),
}).optional().nullable()

export const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(200),
  year: z.number().int().min(2020).max(2100),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  isTeamEvent: z.boolean().default(true),
  pointsForWin: z.number().min(0).default(1),
  pointsForHalf: z.number().min(0).default(0.5),
  pointsToWin: z.number().min(0).optional().nullable(),
  handicapConfig: handicapConfigSchema,
})

export const updateTripSchema = createTripSchema.partial()

export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>
