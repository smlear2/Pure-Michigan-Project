import { z } from 'zod'

export const createMatchSchema = z.object({
  matchNumber: z.number().int().min(1),
  players: z.array(
    z.object({
      tripPlayerId: z.string().min(1, 'Trip player ID is required'),
      side: z.number().int().min(1).max(2),
    })
  ).min(2, 'A match requires at least 2 players'),
})

export const updateMatchSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE']).optional(),
  resultText: z.string().optional().nullable(),
  side1Points: z.number().optional(),
  side2Points: z.number().optional(),
})
