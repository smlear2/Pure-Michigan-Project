import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, requireOrganizer } from '@/lib/auth'
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response'

// GET /api/trips/[tripId]/courses — courses linked to this trip
export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const tripCourses = await prisma.tripCourse.findMany({
      where: { tripId: params.tripId },
      include: {
        course: {
          include: {
            tees: {
              include: { holes: { orderBy: { number: 'asc' } } },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    })

    const courses = tripCourses.map((tc) => tc.course)

    return successResponse(courses)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/trips/[tripId]/courses — link a course to this trip
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const { courseId } = await request.json()
    if (!courseId) return errorResponse('courseId is required', 'VALIDATION_ERROR', 400)

    await prisma.tripCourse.create({
      data: { tripId: params.tripId, courseId },
    })

    return successResponse({ linked: true }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/trips/[tripId]/courses — unlink a course from this trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const auth = await getCurrentUser(request)
    if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

    const isOrganizer = await requireOrganizer(params.tripId, auth.dbUser.id)
    if (!isOrganizer) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const { courseId } = await request.json()
    if (!courseId) return errorResponse('courseId is required', 'VALIDATION_ERROR', 400)

    await prisma.tripCourse.deleteMany({
      where: { tripId: params.tripId, courseId },
    })

    return successResponse({ unlinked: true })
  } catch (error) {
    return handleApiError(error)
  }
}
