import { z } from 'zod'

export const teamSchema = z.object({
  id: z.string().optional(), // Present for existing teams, absent for new
  name: z.string().min(1, 'Team name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
  sortOrder: z.number().int().min(0),
})

export const upsertTeamsSchema = z.object({
  teams: z.array(teamSchema).min(2, 'At least 2 teams required'),
  defendingChampionTeamId: z.string().optional().nullable(),
})

export type TeamInput = z.infer<typeof teamSchema>
export type UpsertTeamsInput = z.infer<typeof upsertTeamsSchema>
