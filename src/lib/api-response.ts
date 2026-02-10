import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    { error: { message, code, details } },
    { status }
  )
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      error.errors
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field'
      return errorResponse(
        `A record with this ${target} already exists`,
        'UNIQUE_CONSTRAINT',
        409
      )
    }
    if (error.code === 'P2025') {
      return errorResponse(
        'Record not found',
        'NOT_FOUND',
        404
      )
    }
  }

  if (error instanceof SyntaxError) {
    return errorResponse('Invalid JSON in request body', 'INVALID_JSON', 400)
  }

  console.error('Unhandled API error:', error)
  return errorResponse(
    'Internal server error',
    'INTERNAL_ERROR',
    500
  )
}
