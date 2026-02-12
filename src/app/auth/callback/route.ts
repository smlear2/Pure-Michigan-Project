import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const origin = getOrigin(request)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // Ensure a Prisma User record exists for this Supabase user
  const existing = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
  })

  if (!existing) {
    // Check if a placeholder user was created for this email (e.g., by an organizer adding them to a trip)
    const pendingUser = await prisma.user.findUnique({
      where: { email: data.user.email! },
    })

    if (pendingUser && pendingUser.supabaseId.startsWith('pending-')) {
      // Merge: update the placeholder with the real Supabase ID
      await prisma.user.update({
        where: { id: pendingUser.id },
        data: {
          supabaseId: data.user.id,
          name: data.user.user_metadata?.name || pendingUser.name,
        },
      })
    } else if (!pendingUser) {
      // No existing user at all — create a new one
      await prisma.user.create({
        data: {
          supabaseId: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
        },
      })
    }
  }

  // Redirect to `next` if provided and is a safe relative path
  const redirectPath = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(`${origin}${redirectPath}`)
}

function getOrigin(request: Request): string {
  // On Vercel, x-forwarded-host contains the actual deployment URL
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}
