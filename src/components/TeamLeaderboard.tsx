'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TeamLeaderboardProps {
  usPoints: number
  europePoints: number
  pointsToWin: number
  tournamentName?: string
}

export function TeamLeaderboard({
  usPoints,
  europePoints,
  pointsToWin,
  tournamentName = "Michigan Open"
}: TeamLeaderboardProps) {
  const totalPoints = usPoints + europePoints
  const maxPoints = 24 // Total available in tournament
  const usPercentage = (usPoints / maxPoints) * 100
  const europePercentage = (europePoints / maxPoints) * 100
  
  // Determine leader
  const usLeading = usPoints > europePoints
  const europeLeading = europePoints > usPoints
  const tied = usPoints === europePoints
  
  // Check for winner
  const usWins = usPoints >= pointsToWin
  const europeWins = europePoints >= pointsToWin + 0.5 // Europe needs 14.5 to win outright
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#002868] via-gray-700 to-[#003399] text-white">
        <CardTitle className="text-center text-2xl">{tournamentName}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Winner banner if applicable */}
        {(usWins || europeWins) && (
          <div className={cn(
            "text-center py-3 mb-4 rounded-lg text-white font-bold text-xl",
            usWins ? "bg-[#002868]" : "bg-[#003399]"
          )}>
            🏆 {usWins ? "USA WINS!" : "EUROPE WINS!"} 🏆
          </div>
        )}
        
        {/* Points display */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* US */}
          <div className={cn(
            "text-center p-4 rounded-lg",
            usLeading ? "bg-[#002868] text-white" : "bg-[#002868]/10"
          )}>
            <div className="text-sm font-medium mb-1">USA 🇺🇸</div>
            <div className={cn(
              "text-4xl font-bold",
              usLeading ? "text-white" : "text-[#002868]"
            )}>
              {usPoints}
            </div>
            <div className={cn(
              "text-xs mt-1",
              usLeading ? "text-white/80" : "text-muted-foreground"
            )}>
              {pointsToWin - usPoints > 0 
                ? `${pointsToWin - usPoints} to win` 
                : "Winner!"}
            </div>
          </div>
          
          {/* Center - VS or status */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-muted-foreground text-sm mb-2">
              {tied ? "TIED" : ""}
            </div>
            <div className="text-3xl font-light text-muted-foreground">vs</div>
            <div className="text-xs text-muted-foreground mt-2">
              {maxPoints - totalPoints} pts remaining
            </div>
          </div>
          
          {/* Europe */}
          <div className={cn(
            "text-center p-4 rounded-lg",
            europeLeading ? "bg-[#003399] text-white" : "bg-[#003399]/10"
          )}>
            <div className="text-sm font-medium mb-1">EUROPE 🇪🇺</div>
            <div className={cn(
              "text-4xl font-bold",
              europeLeading ? "text-white" : "text-[#003399]"
            )}>
              {europePoints}
            </div>
            <div className={cn(
              "text-xs mt-1",
              europeLeading ? "text-white/80" : "text-muted-foreground"
            )}>
              {pointsToWin + 0.5 - europePoints > 0 
                ? `${pointsToWin + 0.5 - europePoints} to win` 
                : "Winner!"}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          {/* US side (left) */}
          <div 
            className="absolute left-0 top-0 h-full bg-[#002868] transition-all duration-500"
            style={{ width: `${usPercentage}%` }}
          />
          {/* Europe side (right) */}
          <div 
            className="absolute right-0 top-0 h-full bg-[#003399] transition-all duration-500"
            style={{ width: `${europePercentage}%` }}
          />
          {/* Center line for winning threshold */}
          <div 
            className="absolute top-0 h-full w-0.5 bg-yellow-400"
            style={{ left: `${(pointsToWin / maxPoints) * 100}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{usPoints} pts</span>
          <span className="text-yellow-600">{pointsToWin} to win</span>
          <span>{europePoints} pts</span>
        </div>
      </CardContent>
    </Card>
  )
}
