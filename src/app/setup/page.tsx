'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface TripSummary {
  id: string
  name: string
  year: number
  teams: { id: string }[]
  tripPlayers: { id: string }[]
  courses: { id: string }[]
  rounds: { id: string }[]
}

interface SetupStep {
  id: string
  title: string
  description: string
  href: string
  count: number
  target: string
  done: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripIdParam = searchParams.get('tripId')

  const [trip, setTrip] = useState<TripSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadTrip = async () => {
      try {
        if (tripIdParam) {
          // Load specific trip
          const res = await fetch(`/api/trips/${tripIdParam}`)
          if (!res.ok) throw new Error('Failed to load trip')
          const json = await res.json()
          setTrip(json.data)
        } else {
          // Find user's most recent trip
          const res = await fetch('/api/trips')
          if (!res.ok) throw new Error('Failed to load trips')
          const json = await res.json()
          const trips = json.data || []
          if (trips.length > 0) {
            // Redirect to that trip's setup
            router.replace(`/setup?tripId=${trips[0].id}`)
            return
          }
          // No trips — redirect to create one
          router.push('/setup/trip')
          return
        }
      } catch {
        setError('Failed to load trip data')
      } finally {
        setLoading(false)
      }
    }

    loadTrip()
  }, [tripIdParam, router])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
          Loading setup...
        </p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-red-500 mb-4">{error || 'Trip not found'}</p>
        <Button onClick={() => router.push('/setup/trip')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Create a Trip
        </Button>
      </div>
    )
  }

  const steps: SetupStep[] = [
    {
      id: 'trip',
      title: 'Trip Details',
      description: 'Name, dates, scoring rules',
      href: `/setup/trip?tripId=${trip.id}`,
      count: 1,
      target: '',
      done: true, // Trip exists if we got here
    },
    {
      id: 'teams',
      title: 'Teams',
      description: 'Create teams and choose colors',
      href: `/setup/teams?tripId=${trip.id}`,
      count: trip.teams.length,
      target: `${trip.teams.length} team${trip.teams.length !== 1 ? 's' : ''}`,
      done: trip.teams.length >= 2,
    },
    {
      id: 'players',
      title: 'Players',
      description: 'Add players and assign to teams',
      href: `/setup/players?tripId=${trip.id}`,
      count: trip.tripPlayers.length,
      target: `${trip.tripPlayers.length} player${trip.tripPlayers.length !== 1 ? 's' : ''}`,
      done: trip.tripPlayers.length > 1,
    },
    {
      id: 'courses',
      title: 'Courses',
      description: 'Search and add golf courses',
      href: `/setup/courses?tripId=${trip.id}`,
      count: trip.courses.length,
      target: `${trip.courses.length} course${trip.courses.length !== 1 ? 's' : ''}`,
      done: trip.courses.length >= 1,
    },
    {
      id: 'rounds',
      title: 'Rounds',
      description: 'Configure rounds, formats, and tees',
      href: `/setup/rounds?tripId=${trip.id}`,
      count: trip.rounds.length,
      target: `${trip.rounds.length} round${trip.rounds.length !== 1 ? 's' : ''}`,
      done: trip.rounds.length >= 1,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const nextStep = steps.find((s) => !s.done)

  return (
    <div className="relative min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white mb-2"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            {trip.name}
          </h1>
          <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            {completedCount}/{steps.length} steps complete
          </p>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Setup steps */}
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isNext = nextStep?.id === step.id

            return (
              <Link href={step.href} key={step.id}>
                <div
                  className={`bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border rounded-xl p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md ${
                    isNext
                      ? 'border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Step number / check */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : isNext
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500'
                      }`}
                      style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                    >
                      {step.done ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">{step.title}</h3>
                        {step.target && (
                          <span
                            className="text-xs text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                          >
                            {step.target}
                          </span>
                        )}
                        {isNext && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Next</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-gray-400">{step.description}</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-slate-400 dark:text-gray-500 shrink-0">&rarr;</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* All done banner */}
        {completedCount === steps.length && (
          <div className="mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-6 text-center">
            <h3
              className="text-lg font-light text-emerald-900 dark:text-emerald-200 mb-2"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Setup Complete
            </h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-4" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Your trip is ready to go. You can still edit any step above.
            </p>
            <Button
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Go to Trip Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
