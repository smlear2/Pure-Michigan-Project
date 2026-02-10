'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Setup steps
const setupSteps = [
  {
    id: 'trip',
    title: 'Create Trip',
    description: 'Name your trip and set the dates',
    href: '/setup/trip',
    icon: '🏌️',
  },
  {
    id: 'teams',
    title: 'Setup Teams',
    description: 'Create teams and choose colors (optional for individual events)',
    href: '/setup/teams',
    icon: '👥',
  },
  {
    id: 'players',
    title: 'Add Players',
    description: 'Add players with their handicaps and assign to teams',
    href: '/setup/players',
    icon: '⛳',
  },
  {
    id: 'courses',
    title: 'Add Courses',
    description: 'Enter course details, tees, and hole-by-hole data',
    href: '/setup/courses',
    icon: '🗺️',
  },
  {
    id: 'rounds',
    title: 'Configure Rounds',
    description: 'Set up each round with format, course, and pairings',
    href: '/setup/rounds',
    icon: '📅',
  },
  {
    id: 'scoring',
    title: 'Scoring Rules',
    description: 'Configure skins, MVP weights, and other scoring options',
    href: '/setup/scoring',
    icon: '🎯',
  },
]

export default function SetupPage() {
  // In a real app, this would come from the database
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Trip Setup</h1>
          <p className="text-muted-foreground">
            Configure your golf trip step by step. You can always come back and make changes.
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {setupSteps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    completedSteps.includes(step.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {completedSteps.includes(step.id) ? '✓' : idx + 1}
                </div>
                {idx < setupSteps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    completedSteps.includes(step.id) ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Setup cards */}
        <div className="space-y-4">
          {setupSteps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id)
            const isNext = idx === completedSteps.length
            
            return (
              <Link href={step.href} key={step.id}>
                <Card className={`cursor-pointer transition-all hover:shadow-md ${
                  isNext ? 'border-primary ring-1 ring-primary' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{step.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{step.title}</h3>
                          {isCompleted && (
                            <Badge variant="success" className="bg-green-500">Complete</Badge>
                          )}
                          {isNext && (
                            <Badge variant="default">Next Step</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                      </div>
                      <div className="text-muted-foreground">
                        →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              📥 Import from Spreadsheet
            </Button>
            <Button variant="outline" size="sm">
              📋 Copy from Previous Trip
            </Button>
            <Button variant="outline" size="sm">
              🔗 Import Course from Database
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
