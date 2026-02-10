import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get the current authenticated user from request cookies.
 * Returns { supabaseUser, dbUser } or null if not authenticated.
 */
export async function getCurrentUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // API routes don't need to set cookies — middleware handles refresh
        },
      },
    }
  )

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  if (!dbUser) return null

  return { supabaseUser, dbUser }
}

/**
 * Check if the given user is a member of the given trip.
 * Returns the TripPlayer record or null.
 */
export async function requireTripMember(tripId: string, userId: string) {
  return prisma.tripPlayer.findFirst({
    where: { tripId, userId },
  })
}

/**
 * Check if the given user is an ORGANIZER of the given trip.
 */
export async function requireOrganizer(tripId: string, userId: string): Promise<boolean> {
  const tripPlayer = await prisma.tripPlayer.findFirst({
    where: {
      tripId,
      userId,
      role: 'ORGANIZER',
    },
  })

  return !!tripPlayer
}
