import { z } from 'zod'

export const holeSchema = z.object({
  number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(5),
  yardage: z.number().int().min(0).max(800),
  handicap: z.number().int().min(1).max(18),
})

export const createTeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tee name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
  rating: z.number().min(55).max(85),
  slope: z.number().int().min(55).max(155),
  holes: z.array(holeSchema).length(18),
})

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200),
  location: z.string().max(200).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  tees: z.array(createTeeSchema).min(0),
})

export const updateCourseSchema = createCourseSchema

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type CreateTeeInput = z.infer<typeof createTeeSchema>
export type HoleInput = z.infer<typeof holeSchema>
