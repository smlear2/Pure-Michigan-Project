'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TripSetupPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    numberOfGolfers: '',
    numberOfRounds: '',
    holesPerRound: '18' as '9' | '18',
    eventFormat: 'match' as 'match' | 'stroke', // match play or stroke play
    isTeamEvent: true,
    pointsForWin: 1,
    pointsForHalf: 0.5,
    defendingChampion: '', // Team ID of defending champion (retains on tie)
    strokePlayScoring: 'both' as 'gross' | 'net' | 'both', // for stroke play events
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
      // When start date changes, update end date if it's empty or before start date
      if (name === 'startDate' && value) {
        if (!prev.endDate || prev.endDate < value) {
          updated.endDate = value
        }
      }
      return updated
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('currentTrip', JSON.stringify(formData))
    router.push('/setup/teams')
  }

  return (
    <div className="relative min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => router.push('/setup')}
            className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm flex items-center gap-1"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            ← Back to Setup
          </button>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
            <h1 className="text-2xl sm:text-3xl font-light text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Create Your Trip
            </h1>
            <p className="text-slate-600 dark:text-gray-400 text-sm" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Enter the basic details for your golf trip. You can change these later.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Trip Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Trip Name *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Michigan Open, Scottsdale Boys Trip, Ryder Cup 2025"
                  required
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Year *
                </label>
                <Input
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  min={2020}
                  max={2100}
                  required
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <Input
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <Input
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    min={formData.startDate || undefined}
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Northern Michigan, Scottsdale AZ"
                  className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Event Size */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Number of Golfers *
                  </label>
                  <Input
                    name="numberOfGolfers"
                    type="number"
                    min="2"
                    value={formData.numberOfGolfers}
                    onChange={handleChange}
                    placeholder="e.g., 12"
                    required
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Number of Rounds *
                  </label>
                  <Input
                    name="numberOfRounds"
                    type="number"
                    min="1"
                    value={formData.numberOfRounds}
                    onChange={handleChange}
                    placeholder="e.g., 4"
                    required
                    className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Holes Per Round *
                  </label>
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2.5 rounded-lg border transition-colors ${
                      formData.holesPerRound === '9'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-gray-300 hover:border-emerald-500/50'
                    }`}>
                      <input
                        type="radio"
                        name="holesPerRound"
                        value="9"
                        checked={formData.holesPerRound === '9'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="font-medium">9</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-2.5 rounded-lg border transition-colors ${
                      formData.holesPerRound === '18'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-gray-300 hover:border-emerald-500/50'
                    }`}>
                      <input
                        type="radio"
                        name="holesPerRound"
                        value="18"
                        checked={formData.holesPerRound === '18'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="font-medium">18</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Optional notes about the trip..."
                />
              </div>

              {/* Event Format - Match Play vs Stroke Play */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                  Event Format
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                    formData.eventFormat === 'match'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="eventFormat"
                      checked={formData.eventFormat === 'match'}
                      onChange={() => setFormData(prev => ({ ...prev, eventFormat: 'match' }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Match Play</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        Compete to win individual holes
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                    formData.eventFormat === 'stroke'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="eventFormat"
                      checked={formData.eventFormat === 'stroke'}
                      onChange={() => setFormData(prev => ({ ...prev, eventFormat: 'stroke' }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Stroke Play</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        Total strokes count, lowest gross and/or net score wins
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Team vs Individual */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                  Competition Type
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                    formData.isTeamEvent
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="isTeamEvent"
                      checked={formData.isTeamEvent === true}
                      onChange={() => setFormData(prev => ({ ...prev, isTeamEvent: true }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Team Event</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        {formData.eventFormat === 'match'
                          ? 'Players compete in teams (like Ryder Cup)'
                          : 'Combined team scores'}
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                    !formData.isTeamEvent
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                  }`}>
                    <input
                      type="radio"
                      name="isTeamEvent"
                      checked={formData.isTeamEvent === false}
                      onChange={() => setFormData(prev => ({ ...prev, isTeamEvent: false }))}
                      className="w-4 h-4 mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">Individual</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        {formData.eventFormat === 'match'
                          ? '1v1 bracket or round-robin matches'
                          : 'Every player for themselves'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Points per match (only for match play) */}
              {formData.eventFormat === 'match' && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                    Points Per Match
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Points for Win
                      </label>
                      <Input
                        name="pointsForWin"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.pointsForWin}
                        onChange={handleChange}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">
                        Points for Halve
                      </label>
                      <Input
                        name="pointsForHalf"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.pointsForHalf}
                        onChange={handleChange}
                        className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Stroke Play Options */}
              {formData.eventFormat === 'stroke' && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/30">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
                    Scoring Type
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                      formData.strokePlayScoring === 'gross'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                    }`}>
                      <input
                        type="radio"
                        name="strokePlayScoring"
                        checked={formData.strokePlayScoring === 'gross'}
                        onChange={() => setFormData(prev => ({ ...prev, strokePlayScoring: 'gross' }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">Gross Only</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">No handicaps</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                      formData.strokePlayScoring === 'net'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                    }`}>
                      <input
                        type="radio"
                        name="strokePlayScoring"
                        checked={formData.strokePlayScoring === 'net'}
                        onChange={() => setFormData(prev => ({ ...prev, strokePlayScoring: 'net' }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">Net Only</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">With handicaps</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border flex-1 transition-colors ${
                      formData.strokePlayScoring === 'both'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-emerald-500/50'
                    }`}>
                      <input
                        type="radio"
                        name="strokePlayScoring"
                        checked={formData.strokePlayScoring === 'both'}
                        onChange={() => setFormData(prev => ({ ...prev, strokePlayScoring: 'both' }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">Both</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Gross & Net winners</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/setup')}
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Save & Continue →
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
