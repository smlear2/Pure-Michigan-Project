import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createCourseSchema } from '@/lib/validators/course'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

const courseInclude = {
  tees: {
    include: {
      holes: {
        orderBy: { number: 'asc' as const },
      },
    },
    orderBy: { name: 'asc' as const },
  },
}

// GET /api/courses
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const courses = await prisma.course.findMany({
      include: courseInclude,
      orderBy: { name: 'asc' },
    })
    return successResponse(courses)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/courses
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const body = await request.json()
    const validated = createCourseSchema.parse(body)

    const course = await prisma.course.create({
      data: {
        name: validated.name,
        location: validated.location || null,
        website: validated.website || null,
        tees: {
          create: validated.tees.map((tee) => ({
            name: tee.name,
            color: tee.color,
            rating: tee.rating,
            slope: tee.slope,
            holes: {
              create: tee.holes.map((hole) => ({
                number: hole.number,
                par: hole.par,
                yardage: hole.yardage,
                handicap: hole.handicap,
              })),
            },
          })),
        },
      },
      include: courseInclude,
    })

    return successResponse(course, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
