import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged in: fetch user's trips
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })

    const trips = dbUser
      ? await prisma.tripPlayer.findMany({
          where: { userId: dbUser.id },
          include: {
            trip: {
              include: {
                teams: { orderBy: { sortOrder: 'asc' } },
                rounds: { orderBy: { roundNumber: 'asc' } },
              },
            },
          },
        })
      : []

    // For each trip, tally match points per team
    const tripsWithScores = await Promise.all(
      trips.map(async (tp) => {
        const matches = await prisma.match.findMany({
          where: { round: { tripId: tp.tripId } },
          include: {
            players: { include: { tripPlayer: true } },
          },
        })

        const teamPoints: Record<string, number> = {}
        for (const team of tp.trip.teams) {
          teamPoints[team.id] = 0
        }

        for (const match of matches) {
          // Determine which side each team is on
          const side1TeamIds = new Set(
            match.players.filter((p) => p.side === 1).map((p) => p.tripPlayer.teamId)
          )
          const side2TeamIds = new Set(
            match.players.filter((p) => p.side === 2).map((p) => p.tripPlayer.teamId)
          )

          for (const teamId of Array.from(side1TeamIds)) {
            if (teamId && teamPoints[teamId] !== undefined) {
              teamPoints[teamId] += match.side1Points
            }
          }
          for (const teamId of Array.from(side2TeamIds)) {
            if (teamId && teamPoints[teamId] !== undefined) {
              teamPoints[teamId] += match.side2Points
            }
          }
        }

        return { ...tp, teamPoints }
      })
    )

    const firstName = dbUser?.name.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || 'there'

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="animate-fadeIn">
          <p
            className="text-emerald-600 dark:text-emerald-400 text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            Welcome back
          </p>
          <h1
            className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-10"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            {firstName}.
          </h1>

          {tripsWithScores.length > 0 ? (
            <div className="space-y-4">
              {tripsWithScores.map(({ trip, teamPoints }) => {
                const formats = Array.from(new Set(trip.rounds.map((r) => r.format)))
                const formatLabels: Record<string, string> = {
                  FOURBALL: 'Fourball',
                  FOURSOMES: 'Foursomes',
                  SCRAMBLE: 'Scramble',
                  SINGLES: 'Singles',
                  MODIFIED_ALT_SHOT: 'Mod. Alt Shot',
                  SHAMBLE: 'Shamble',
                  STROKEPLAY: 'Strokeplay',
                }

                return (
                  <Link key={trip.id} href={`/trips/${trip.id}`} className="block group">
                    <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 sm:p-8 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <h2
                            className="text-xl sm:text-2xl font-light text-slate-900 dark:text-white mb-1"
                            style={{ fontFamily: 'var(--font-fraunces), serif' }}
                          >
                            {trip.name} {trip.year}
                          </h2>
                          <p
                            className="text-sm text-slate-500 dark:text-slate-400 mb-4"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                          >
                            {trip.location} · {trip.rounds.length} rounds
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {formats.map((f) => formatLabels[f] || f).join(' · ')}
                          </p>
                        </div>

                        {/* Team scores */}
                        {trip.isTeamEvent && trip.teams.length >= 2 && (
                          <div className="flex items-center gap-4 sm:gap-6">
                            {trip.teams.map((team, i) => (
                              <div key={team.id} className={i === 0 ? 'text-right' : 'text-left'}>
                                <div
                                  className="text-xs text-slate-500 dark:text-slate-400 mb-1"
                                  style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                                >
                                  {team.name}
                                </div>
                                <div
                                  className="text-2xl sm:text-3xl font-bold"
                                  style={{ color: team.color }}
                                >
                                  {teamPoints[team.id] || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center text-sm text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                          View trip
                        </span>
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No trips yet. Create one or join with an invite code.
              </p>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <Link href="/setup/trip">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                + Create a Trip
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Guest: marketing landing
  return (
    <div className="relative">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
        <div className="animate-fadeIn">
          <p
            className="text-emerald-600 dark:text-emerald-400 text-xs tracking-widest uppercase mb-6"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            Ryder Cup Style · Match Play & Skins
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-900 dark:text-white mb-6"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Your tournament,
            <br />
            <span className="text-emerald-600 dark:text-emerald-400">automated.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10">
            Set it up. Play golf. Scorecards, leaderboards, standings, and skins handle themselves.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Live Scoring',
              description: 'One scorer per group. Scores sync in real-time. Post-round verification locks results.',
            },
            {
              title: 'Automated Leaderboard',
              description: 'Match points, standings, and team scores update automatically as scores come in.',
            },
            {
              title: 'Skins & Wagers',
              description: 'Variable pot skins, closest-to-pin tracking, and side game management built in.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all"
            >
              <h3
                className="text-base font-semibold text-slate-900 dark:text-white mb-2"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
