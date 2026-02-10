'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatLabels } from '@/types'

interface Trip {
  name: string
  year: number
  startDate: string
  endDate: string
  location: string
  isTeamEvent: boolean
  pointsToWin?: number
}

interface Team {
  id: string
  name: string
  color: string
}

interface Player {
  id: string
  name: string
  handicapIndex: number
  teamId: string
}

interface Round {
  id: string
  roundNumber: number
  name: string
  courseId: string
  format: string
}

interface Course {
  id: string
  name: string
}

export default function Home() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    const savedTrip = localStorage.getItem('currentTrip')
    const savedTeams = localStorage.getItem('tripTeams')
    const savedPlayers = localStorage.getItem('tripPlayers')
    const savedRounds = localStorage.getItem('tripRounds')
    const savedCourses = localStorage.getItem('tripCourses')

    if (savedTrip) setTrip(JSON.parse(savedTrip))
    if (savedTeams) setTeams(JSON.parse(savedTeams))
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers))
    if (savedRounds) setRounds(JSON.parse(savedRounds))
    if (savedCourses) setCourses(JSON.parse(savedCourses))

    setHasData(!!(savedTrip || savedPlayers || savedRounds))
  }, [])

  const getTeamPlayers = (teamId: string) => players.filter(p => p.teamId === teamId)
  const getCourseName = (courseId: string) => courses.find(c => c.id === courseId)?.name || 'TBD'

  // No data yet - show welcome screen
  if (!hasData) {
    return (
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto text-center animate-fadeIn">
            <div className="text-6xl mb-6">⛳</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-900 dark:text-white mb-4" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Golf Trip Tracker
            </h1>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-lg tracking-wider uppercase mb-8" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Ryder Cup Style • Match Play & Skins
            </p>
            <p className="text-lg text-slate-600 dark:text-gray-400 mb-10">
              Manage your golf trips with ease. Track matches, skins, and MVP standings.
            </p>

            <div className="space-y-4">
              <Link href="/setup/trip">
                <Button size="lg" className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg">
                  Create Your Trip
                </Button>
              </Link>

              <p className="text-sm text-slate-500 dark:text-gray-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                Set up teams, add players, configure courses, and start scoring
              </p>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-4 sm:gap-6 text-left">
              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all">
                <div className="text-3xl mb-3">👥</div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Flexible Teams</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Any number of teams with custom names and colors
                </p>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Live Scoring</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Real-time match status, hole-by-hole tracking
                </p>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Skins & Side Games</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Automatic skins calculation and money tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Has data - show dashboard
  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8 sm:mb-12 animate-fadeIn">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {trip?.name || 'Golf Trip'}
            </h1>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-lg tracking-wider uppercase" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              {trip?.year} • {trip?.location}
            </p>
          </div>
          {trip?.isTeamEvent && teams.length >= 2 && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>{teams[0]?.name}</div>
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: teams[0]?.color }}>0</div>
              </div>
              <div className="text-2xl text-slate-400 dark:text-gray-600">vs</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>{teams[1]?.name}</div>
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: teams[1]?.color }}>0</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          <Link href="/scoring">
            <button className="w-full h-14 sm:h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2">
              📝 <span>Live Scoring</span>
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="w-full h-14 sm:h-16 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
              🏆 <span>Leaderboard</span>
            </button>
          </Link>
          <Link href="/skins">
            <button className="w-full h-14 sm:h-16 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
              💰 <span>Skins</span>
            </button>
          </Link>
          <Link href="/setup">
            <button className="w-full h-14 sm:h-16 bg-white/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
              ⚙️ <span>Setup</span>
            </button>
          </Link>
        </div>

        {/* Setup reminder if incomplete */}
        {(teams.length === 0 || players.length === 0 || rounds.length === 0) && (
          <div className="mb-8 p-4 bg-amber-100 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-700/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Setup incomplete</p>
                <p className="text-sm text-amber-700 dark:text-amber-300/70" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                  {teams.length === 0 && 'Add teams • '}
                  {players.length === 0 && 'Add players • '}
                  {rounds.length === 0 && 'Configure rounds'}
                </p>
              </div>
              <Link href="/setup">
                <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                  Complete Setup
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Rounds */}
        {rounds.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Rounds
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {rounds.sort((a, b) => a.roundNumber - b.roundNumber).map((round, idx) => (
                <div
                  key={round.id}
                  className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                      <div className="text-2xl sm:text-4xl font-bold text-slate-300 dark:text-gray-500 flex-shrink-0 w-8 sm:w-12" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                        {round.roundNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white truncate">{round.name}</div>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                          {getCourseName(round.courseId)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                        {formatLabels[round.format as keyof typeof formatLabels] || round.format}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-gray-400 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm border border-slate-200 dark:border-slate-700">
                        Not Started
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams */}
        {teams.length > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Teams
            </h2>
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {teams.map((team, idx) => (
                <div
                  key={team.id}
                  className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="p-4 sm:p-5" style={{ backgroundColor: team.color }}>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">{team.name}</h3>
                    <p className="text-sm text-white/70" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                      {getTeamPlayers(team.id).length} players
                    </p>
                  </div>
                  <div className="p-4 sm:p-5">
                    {getTeamPlayers(team.id).length === 0 ? (
                      <p className="text-slate-500 dark:text-gray-400 text-center py-4">No players assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {getTeamPlayers(team.id)
                          .sort((a, b) => a.handicapIndex - b.handicapIndex)
                          .map(player => (
                            <div key={player.id} className="flex justify-between items-center p-2 sm:p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all">
                              <span className="text-slate-900 dark:text-white">{player.name}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                                {player.handicapIndex}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
