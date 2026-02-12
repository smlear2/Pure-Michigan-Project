import { z } from 'zod'

export const addPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required').max(200),
  email: z.string().email('Valid email is required'),
  handicapIndex: z.number().min(-10).max(54).optional().nullable(),
  ghinNumber: z.string().max(20).optional().or(z.literal('')),
  teamId: z.string().optional().nullable(),
})

export const updatePlayerSchema = z.object({
  teamId: z.string().optional().nullable(),
  handicapIndex: z.number().min(-10).max(54).optional().nullable(),
  role: z.enum(['ORGANIZER', 'PLAYER']).optional(),
  skinsOptIn: z.boolean().optional(),
  tiltOptIn: z.boolean().optional(),
})

export type AddPlayerInput = z.infer<typeof addPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
