'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatLabels, formatDescriptions, MatchFormat } from '@/types'

interface Round {
  id: string
  roundNumber: number
  name: string
  date: string
  courseId: string
  teeId: string
  format: MatchFormat
  skinsEnabled: boolean
}

interface Course {
  id: string
  name: string
  tees: { id: string; name: string; color: string }[]
}

const formats: MatchFormat[] = ['FOURBALL', 'FOURSOMES', 'SCRAMBLE', 'SINGLES', 'STROKEPLAY']

export default function RoundsSetupPage() {
  const router = useRouter()
  const [rounds, setRounds] = useState<Round[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [editingRound, setEditingRound] = useState<Round | null>(null)

  useEffect(() => {
    const savedCourses = localStorage.getItem('tripCourses')
    if (savedCourses) setCourses(JSON.parse(savedCourses))
    
    const savedRounds = localStorage.getItem('tripRounds')
    if (savedRounds) setRounds(JSON.parse(savedRounds))
  }, [])

  const saveRounds = (updated: Round[]) => {
    setRounds(updated)
    localStorage.setItem('tripRounds', JSON.stringify(updated))
  }

  const addRound = () => {
    const nextNum = rounds.length + 1
    setEditingRound({
      id: Date.now().toString(),
      roundNumber: nextNum,
      name: `Round ${nextNum}`,
      date: '',
      courseId: courses[0]?.id || '',
      teeId: courses[0]?.tees[0]?.id || '',
      format: 'FOURBALL',
      skinsEnabled: true,
    })
  }

  const saveRound = () => {
    if (!editingRound) return
    if (!editingRound.courseId || !editingRound.teeId) {
      alert('Please select a course and tee')
      return
    }

    const exists = rounds.find(r => r.id === editingRound.id)
    if (exists) {
      saveRounds(rounds.map(r => r.id === editingRound.id ? editingRound : r))
    } else {
      saveRounds([...rounds, editingRound])
    }
    setEditingRound(null)
  }

  const deleteRound = (id: string) => {
    if (confirm('Delete this round?')) {
      saveRounds(rounds.filter(r => r.id !== id))
    }
  }

  const getCourseName = (courseId: string) => courses.find(c => c.id === courseId)?.name || 'Unknown'
  const getTeeName = (courseId: string, teeId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course?.tees.find(t => t.id === teeId)?.name || 'Unknown'
  }
  const getTeeColor = (courseId: string, teeId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course?.tees.find(t => t.id === teeId)?.color || '#666'
  }

  // Round Editor
  if (editingRound) {
    const selectedCourse = courses.find(c => c.id === editingRound.courseId)
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configure Round</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Round Name</label>
                <Input
                  value={editingRound.name}
                  onChange={e => setEditingRound({ ...editingRound, name: e.target.value })}
                  placeholder="e.g., Day 1 AM, Finals"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editingRound.date}
                  onChange={e => setEditingRound({ ...editingRound, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Course</label>
                <select
                  value={editingRound.courseId}
                  onChange={e => {
                    const course = courses.find(c => c.id === e.target.value)
                    setEditingRound({
                      ...editingRound,
                      courseId: e.target.value,
                      teeId: course?.tees[0]?.id || ''
                    })
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                >
                  <option value="">Select course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tees</label>
                <select
                  value={editingRound.teeId}
                  onChange={e => setEditingRound({ ...editingRound, teeId: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  disabled={!selectedCourse}
                >
                  <option value="">Select tees...</option>
                  {selectedCourse?.tees.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Match Format</label>
              <div className="grid grid-cols-1 gap-2">
                {formats.map(f => (
                  <label
                    key={f}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      editingRound.format === f ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={editingRound.format === f}
                      onChange={() => setEditingRound({ ...editingRound, format: f })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{formatLabels[f]}</div>
                      <div className="text-sm text-muted-foreground">{formatDescriptions[f]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <input
                type="checkbox"
                id="skins"
                checked={editingRound.skinsEnabled}
                onChange={e => setEditingRound({ ...editingRound, skinsEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="skins" className="cursor-pointer">
                <div className="font-medium">Enable Skins</div>
                <div className="text-sm text-muted-foreground">Track skins game for this round</div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditingRound(null)}>Cancel</Button>
              <Button onClick={saveRound}>Save Round</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main rounds list
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/setup')}>← Back to Setup</Button>
      </div>

      {courses.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ No courses added yet. <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/setup/courses')}>Add courses first</Button>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Rounds</CardTitle>
              <CardDescription>Configure each round of your trip</CardDescription>
            </div>
            <Button onClick={addRound} disabled={courses.length === 0}>+ Add Round</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No rounds configured yet</p>
              <Button onClick={addRound} disabled={courses.length === 0}>Add Your First Round</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rounds.sort((a, b) => a.roundNumber - b.roundNumber).map(round => (
                <div key={round.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{round.name}</h3>
                        <Badge variant="outline">{formatLabels[round.format]}</Badge>
                        {round.skinsEnabled && <Badge variant="secondary">Skins</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getCourseName(round.courseId)} • 
                        <span 
                          className="ml-1 px-1 rounded"
                          style={{ backgroundColor: getTeeColor(round.courseId, round.teeId) + '20' }}
                        >
                          {getTeeName(round.courseId, round.teeId)} tees
                        </span>
                        {round.date && ` • ${new Date(round.date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingRound(round)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteRound(round.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => router.push('/setup/courses')}>← Back</Button>
        <Button onClick={() => router.push('/setup/scoring')}>Save & Continue →</Button>
      </div>
    </div>
  )
}
