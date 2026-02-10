import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCourseSchema } from '@/lib/validators/course'
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

// GET /api/courses/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: courseInclude,
    })

    if (!course) {
      return errorResponse('Course not found', 'NOT_FOUND', 404)
    }

    return successResponse(course)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/courses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validated = updateCourseSchema.parse(body)

    const course = await prisma.$transaction(async (tx) => {
      // Verify the course exists
      const existing = await tx.course.findUnique({
        where: { id: params.id },
        include: { tees: { select: { id: true } } },
      })

      if (!existing) {
        throw new Error('COURSE_NOT_FOUND')
      }

      // Determine which tees to keep, create, and delete
      const existingTeeIds = new Set(existing.tees.map((t) => t.id))
      const submittedTeeIds = new Set(
        validated.tees
          .map((t) => t.id)
          .filter((id): id is string => !!id && existingTeeIds.has(id))
      )

      const teeIdsToDelete = existing.tees
        .filter((t) => !submittedTeeIds.has(t.id))
        .map((t) => t.id)

      const teesToUpdate = validated.tees.filter(
        (t) => t.id && existingTeeIds.has(t.id)
      )

      const teesToCreate = validated.tees.filter(
        (t) => !t.id || !existingTeeIds.has(t.id)
      )

      // Guard: check if tees to delete are referenced by rounds
      if (teeIdsToDelete.length > 0) {
        const referencedTees = await tx.round.findMany({
          where: { teeId: { in: teeIdsToDelete } },
          select: { teeId: true },
        })
        if (referencedTees.length > 0) {
          throw new Error('TEES_IN_USE')
        }

        await tx.tee.deleteMany({
          where: { id: { in: teeIdsToDelete } },
        })
      }

      // Update existing tees (replace holes)
      for (const tee of teesToUpdate) {
        await tx.hole.deleteMany({ where: { teeId: tee.id! } })
        await tx.tee.update({
          where: { id: tee.id! },
          data: {
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
          },
        })
      }

      // Create new tees
      for (const tee of teesToCreate) {
        await tx.tee.create({
          data: {
            courseId: params.id,
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
          },
        })
      }

      // Update course-level fields
      return tx.course.update({
        where: { id: params.id },
        data: {
          name: validated.name,
          location: validated.location || null,
          website: validated.website || null,
        },
        include: courseInclude,
      })
    })

    return successResponse(course)
  } catch (error) {
    if (error instanceof Error && error.message === 'COURSE_NOT_FOUND') {
      return errorResponse('Course not found', 'NOT_FOUND', 404)
    }
    if (error instanceof Error && error.message === 'TEES_IN_USE') {
      return errorResponse(
        'Cannot delete tees that are used in rounds',
        'TEES_IN_USE',
        409
      )
    }
    return handleApiError(error)
  }
}

// DELETE /api/courses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripCourseCount = await prisma.tripCourse.count({
      where: { courseId: params.id },
    })

    if (tripCourseCount > 0) {
      return errorResponse(
        `Cannot delete: this course is used in ${tripCourseCount} trip(s). Remove it from those trips first.`,
        'FOREIGN_KEY_CONSTRAINT',
        409
      )
    }

    await prisma.course.delete({
      where: { id: params.id },
    })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
