import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

const TEE_COLOR_MAP: Record<string, string> = {
  'black': '#1a1a1a',
  'blue': '#0066CC',
  'white': '#E5E5E5',
  'gold': '#FFD700',
  'red': '#CC0000',
  'purple': '#800080',
  'green': '#228B22',
  'silver': '#C0C0C0',
  'orange': '#FF6600',
  'brown': '#8B4513',
}

function inferTeeColor(teeName: string): string {
  const lower = teeName.toLowerCase()
  for (const [key, color] of Object.entries(TEE_COLOR_MAP)) {
    if (lower.includes(key)) return color
  }
  return '#0066CC' // default to blue
}

interface ExternalHole {
  par: number
  yardage: number
  handicap: number
}

interface ExternalTee {
  tee_name: string
  course_rating: number
  slope_rating: number
  total_yards: number
  par_total: number
  number_of_holes: number
  holes: ExternalHole[]
}

interface ExternalCourse {
  id: number
  club_name: string
  course_name: string
  location: {
    address: string
    city: string
    state: string
    country: string
    latitude: number
    longitude: number
  }
  tees: {
    male?: ExternalTee[]
    female?: ExternalTee[]
  }
}

function transformCourse(ext: ExternalCourse) {
  const allTees = [
    ...(ext.tees.male || []).map(t => ({ ...t, gender: 'male' as const })),
    ...(ext.tees.female || []).map(t => ({ ...t, gender: 'female' as const })),
  ]

  return {
    externalId: ext.id,
    name: ext.course_name || ext.club_name,
    location: [ext.location.city, ext.location.state].filter(Boolean).join(', '),
    address: ext.location.address,
    latitude: ext.location.latitude,
    longitude: ext.location.longitude,
    tees: allTees.map(tee => ({
      name: tee.tee_name.replace(/\s*tees?\s*$/i, ''), // "Blue Tees" -> "Blue"
      color: inferTeeColor(tee.tee_name),
      rating: tee.course_rating,
      slope: tee.slope_rating,
      totalYards: tee.total_yards,
      parTotal: tee.par_total,
      numberOfHoles: tee.number_of_holes,
      gender: tee.gender,
      holes: tee.holes.map((h, idx) => ({
        number: idx + 1,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap,
      })),
    })),
  }
}

// GET /api/courses/search?q=...
export async function GET(request: NextRequest) {
  const auth = await getCurrentUser(request)
  if (!auth) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)

  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return errorResponse('Search query must be at least 2 characters', 'INVALID_QUERY', 400)
  }

  const apiKey = process.env.GOLFCOURSE_API_KEY
  if (!apiKey) {
    return errorResponse('Golf course API key not configured', 'CONFIG_ERROR', 500)
  }

  try {
    const res = await fetch(
      `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('GolfCourseAPI error:', res.status, text)
      return errorResponse('External API error', 'EXTERNAL_API_ERROR', 502)
    }

    const data = await res.json()
    const courses = (data.courses || []).map(transformCourse)

    return successResponse(courses)
  } catch (error) {
    console.error('GolfCourseAPI fetch error:', error)
    return errorResponse('Failed to search courses', 'EXTERNAL_API_ERROR', 502)
  }
}
