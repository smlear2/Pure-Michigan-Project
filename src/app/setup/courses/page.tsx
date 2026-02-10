'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Tee {
  id: string
  name: string
  color: string
  rating: number
  slope: number
  holes: { number: number; par: number; yardage: number; handicap: number }[]
}

interface Course {
  id: string
  name: string
  location: string
  tees: Tee[]
}

interface SearchResultTee {
  name: string
  color: string
  rating: number
  slope: number
  totalYards: number
  parTotal: number
  numberOfHoles: number
  gender: 'male' | 'female'
  holes: { number: number; par: number; yardage: number; handicap: number }[]
}

interface SearchResult {
  externalId: number
  name: string
  location: string
  address: string
  tees: SearchResultTee[]
}

export default function CoursesSetupPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Tee selection state — after picking a search result
  const [selectedCourse, setSelectedCourse] = useState<SearchResult | null>(null)
  const [selectedTeeIndices, setSelectedTeeIndices] = useState<Set<number>>(new Set())

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/courses')
      if (!res.ok) throw new Error('Failed to load courses')
      const json = await res.json()
      setCourses(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced course search
  const searchCourses = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json()
      setSearchResults(json.data || [])
      setShowResults(true)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCourses(value), 400)
  }

  // Select a search result — show tee selection step
  const selectSearchResult = (result: SearchResult) => {
    setSelectedCourse(result)
    setSelectedTeeIndices(new Set())
    setSearchQuery('')
    setShowResults(false)
  }

  const toggleTee = (index: number) => {
    setSelectedTeeIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const cancelSelection = () => {
    setSelectedCourse(null)
    setSelectedTeeIndices(new Set())
  }

  // Save selected course + tees to the database
  const saveSelectedCourse = async () => {
    if (!selectedCourse || selectedTeeIndices.size === 0) return

    setIsSaving(true)
    try {
      const teesToSave = Array.from(selectedTeeIndices).map(i => selectedCourse.tees[i])
      const payload = {
        name: selectedCourse.name,
        location: selectedCourse.location || undefined,
        tees: teesToSave.map(tee => ({
          name: tee.name,
          color: tee.color,
          rating: tee.rating,
          slope: tee.slope,
          holes: tee.holes.map(h => ({
            number: h.number,
            par: h.par,
            yardage: h.yardage,
            handicap: h.handicap,
          })),
        })),
      }

      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || 'Failed to save course')
      }

      const json = await res.json()
      setCourses(prev => [...prev, json.data])
      setSelectedCourse(null)
      setSelectedTeeIndices(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete course
  const deleteCourse = async (id: string) => {
    if (!confirm('Remove this course?')) return

    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || 'Failed to delete course')
      }
      setCourses(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center py-12 text-slate-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            Loading courses...
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="relative min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchCourses} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Tee Selection Step — shown after picking a search result
  if (selectedCourse) {
    // All 18-hole tees, deduplicated by name
    const seen = new Set<string>()
    const allTees = selectedCourse.tees
      .map((t, i) => ({ tee: t, index: i }))
      .filter(({ tee }) => tee.numberOfHoles === 18)
      .filter(({ tee }) => {
        if (seen.has(tee.name)) return false
        seen.add(tee.name)
        return true
      })

    return (
      <div className="relative min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
              <h1 className="text-2xl font-light text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                {selectedCourse.name}
              </h1>
              {selectedCourse.location && (
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                  {selectedCourse.location}
                </p>
              )}
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
                Select the tee boxes you want to include for this course.
              </p>

              <div className="space-y-2 mb-4">
                {allTees.map(({ tee, index }) => (
                  <button
                    key={index}
                    onClick={() => toggleTee(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTeeIndices.has(index)
                        ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    style={{ borderLeftWidth: 4, borderLeftColor: tee.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">{tee.name}</span>
                        <span className="text-slate-500 dark:text-gray-400 text-sm ml-3" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                          {tee.rating} / {tee.slope} &middot; {tee.totalYards} yds &middot; Par {tee.parTotal}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedTeeIndices.has(index)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {selectedTeeIndices.has(index) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={cancelSelection}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveSelectedCourse}
                  disabled={isSaving || selectedTeeIndices.size === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? 'Saving...' : `Add Course with ${selectedTeeIndices.size} Tee${selectedTeeIndices.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main view — search + saved courses list
  return (
    <div className="relative min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push('/setup/players')}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Players
          </button>
        </div>

        {/* Course Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl mb-6">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Golf Courses
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Search for courses to add to your trip
            </p>
          </div>

          <div className="p-6">
            <div ref={searchRef} className="relative">
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Search Golf Courses</label>
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Type a course name... (e.g., Pebble Beach)"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                {isSearching && (
                  <div className="flex items-center px-3 text-slate-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                    Searching...
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-[60vh] overflow-y-auto">
                  {searchResults.map((result) => {
                    const seen = new Set<string>()
                    const uniqueTees = result.tees
                      .filter(t => t.numberOfHoles === 18)
                      .filter(t => {
                        if (seen.has(t.name)) return false
                        seen.add(t.name)
                        return true
                      })
                    const hasTees = result.tees.length > 0
                    return (
                      <button
                        key={result.externalId}
                        onClick={() => hasTees ? selectSearchResult(result) : undefined}
                        disabled={!hasTees}
                        className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors ${
                          hasTees
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-medium text-slate-900 dark:text-white">{result.name}</div>
                        <div className="text-sm text-slate-500 dark:text-gray-400">{result.location}</div>
                        {hasTees ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {uniqueTees.map((tee, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ backgroundColor: tee.color, color: tee.color === '#E5E5E5' ? '#000' : '#fff' }}
                              >
                                {tee.name} ({tee.rating}/{tee.slope})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 dark:text-gray-500 mt-1 italic" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                            No tee data available
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-slate-500 dark:text-gray-400 text-sm">
                  No courses found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Courses List */}
        {courses.length > 0 && (
          <div className="space-y-3 mb-6">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 sm:p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{course.name}</h3>
                    {course.location && (
                      <p className="text-slate-500 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>{course.location}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {course.tees.map(tee => (
                        <Badge
                          key={tee.id}
                          style={{ backgroundColor: tee.color, color: tee.color === '#E5E5E5' ? '#000' : '#fff' }}
                        >
                          {tee.name} ({tee.rating}/{tee.slope})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="text-red-500 hover:text-red-700 px-2 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {courses.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-8 text-center mb-6">
            <p className="text-slate-500 dark:text-gray-400 mb-2">No courses added yet</p>
            <p className="text-xs text-slate-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Search above to find and add courses
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              <strong className="text-slate-900 dark:text-white">{courses.length}</strong> course{courses.length !== 1 ? 's' : ''} added
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/setup/players')}
                className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back
              </Button>
              <Button
                onClick={() => router.push('/setup/rounds')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save & Continue →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
