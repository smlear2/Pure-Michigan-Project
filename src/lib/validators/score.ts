import { z } from 'zod'

export const upsertScoresSchema = z.object({
  holeId: z.string().min(1, 'Hole ID is required'),
  scores: z.array(
    z.object({
      matchPlayerId: z.string().min(1),
      grossScore: z.number().int().min(1).max(20),
      driveUsed: z.boolean().optional().nullable(),
    })
  ).min(1, 'At least one score is required'),
})
