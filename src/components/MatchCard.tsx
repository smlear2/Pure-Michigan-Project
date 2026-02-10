'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MatchPlayer {
  name: string
  handicap: number
  team: 'US' | 'EUROPE'
}

interface MatchCardProps {
  matchNumber: number
  format: string
  usPlayers: MatchPlayer[]
  europePlayers: MatchPlayer[]
  status: 'pending' | 'in_progress' | 'complete'
  matchStatus?: {
    leader: 'US' | 'EUROPE' | 'TIED'
    display: string  // "2 UP", "AS", etc.
    thru: number
  }
  result?: {
    winner: 'US' | 'EUROPE' | 'HALVED'
    score: string  // "3&2", "1UP", etc.
  }
  onClick?: () => void
}

export function MatchCard({
  matchNumber,
  format,
  usPlayers,
  europePlayers,
  status,
  matchStatus,
  result,
  onClick
}: MatchCardProps) {
  const isComplete = status === 'complete'
  const isInProgress = status === 'in_progress'
  
  // Determine styling based on result
  const usWon = result?.winner === 'US'
  const europeWon = result?.winner === 'EUROPE'
  const halved = result?.winner === 'HALVED'
  
  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
        onClick && "hover:border-primary"
      )}
      onClick={onClick}
    >
      {/* Match header */}
      <div className="bg-muted px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Match {matchNumber}</span>
          <Badge variant="secondary">{format}</Badge>
        </div>
        {isInProgress && matchStatus && (
          <Badge 
            variant={matchStatus.leader === 'US' ? 'us' : matchStatus.leader === 'EUROPE' ? 'europe' : 'secondary'}
          >
            {matchStatus.display} thru {matchStatus.thru}
          </Badge>
        )}
        {isComplete && result && (
          <Badge variant={usWon ? 'us' : europeWon ? 'europe' : 'secondary'}>
            {halved ? 'Halved' : `${result.winner} ${result.score}`}
          </Badge>
        )}
        {status === 'pending' && (
          <Badge variant="outline">Not Started</Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
          {/* US Players */}
          <div className={cn(
            "p-3 rounded-lg",
            usWon ? "bg-[#002868] text-white" : "bg-[#002868]/5"
          )}>
            <div className="text-xs font-medium mb-2 flex items-center gap-1">
              🇺🇸 USA
              {usWon && <span className="ml-1">✓</span>}
            </div>
            {usPlayers.map((player, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className={cn(
                  "font-medium",
                  usWon ? "text-white" : "text-[#002868]"
                )}>
                  {player.name}
                </span>
                <span className={cn(
                  "text-sm",
                  usWon ? "text-white/70" : "text-muted-foreground"
                )}>
                  ({player.handicap})
                </span>
              </div>
            ))}
          </div>
          
          {/* VS / Score */}
          <div className="text-center">
            {isComplete && result ? (
              <div className="text-lg font-bold">
                {halved ? '½ - ½' : usWon ? '1 - 0' : '0 - 1'}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">vs</div>
            )}
          </div>
          
          {/* Europe Players */}
          <div className={cn(
            "p-3 rounded-lg",
            europeWon ? "bg-[#003399] text-white" : "bg-[#003399]/5"
          )}>
            <div className="text-xs font-medium mb-2 flex items-center gap-1">
              🇪🇺 EUROPE
              {europeWon && <span className="ml-1">✓</span>}
            </div>
            {europePlayers.map((player, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className={cn(
                  "font-medium",
                  europeWon ? "text-white" : "text-[#003399]"
                )}>
                  {player.name}
                </span>
                <span className={cn(
                  "text-sm",
                  europeWon ? "text-white/70" : "text-muted-foreground"
                )}>
                  ({player.handicap})
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
