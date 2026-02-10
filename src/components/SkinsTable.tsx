'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface SkinResult {
  holeNumber: number
  par: number
  winnerId: string | null
  winnerName: string | null
  winnerTeam: 'US' | 'EUROPE' | null
  netScore: number | null
}

interface PlayerSkinSummary {
  playerId: string
  playerName: string
  team: 'US' | 'EUROPE'
  skinsWon: number
  totalMoney: number
}

interface SkinsTableProps {
  roundName: string
  courseName: string
  results: SkinResult[]
  playerSummary: PlayerSkinSummary[]
  potPerSkin: number  // Dollar value per skin
  totalPot: number
}

export function SkinsTable({
  roundName,
  courseName,
  results,
  playerSummary,
  potPerSkin,
  totalPot
}: SkinsTableProps) {
  const skinsAwarded = results.filter(r => r.winnerId !== null).length
  const skinsRemaining = 18 - results.filter(r => r.netScore !== null).length
  
  // Sort summary by skins won descending
  const sortedSummary = [...playerSummary].sort((a, b) => b.skinsWon - a.skinsWon)
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Hole by hole results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Skins - {roundName}</span>
            <Badge variant="secondary">{courseName}</Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {skinsAwarded} skins awarded • {skinsRemaining > 0 ? `${skinsRemaining} holes remaining` : 'Complete'}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {/* Front 9 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">FRONT 9</div>
              {results.slice(0, 9).map(result => (
                <div 
                  key={result.holeNumber}
                  className={cn(
                    "flex items-center justify-between p-2 rounded mb-1",
                    result.winnerId 
                      ? result.winnerTeam === 'US' 
                        ? "bg-[#002868]/10" 
                        : "bg-[#003399]/10"
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {result.holeNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">Par {result.par}</span>
                  </div>
                  {result.winnerId ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        result.winnerTeam === 'US' ? "text-[#002868]" : "text-[#003399]"
                      )}>
                        {result.winnerName}
                      </span>
                      <Badge 
                        variant={result.winnerTeam === 'US' ? 'us' : 'europe'}
                        className="text-xs"
                      >
                        {result.netScore}
                      </Badge>
                    </div>
                  ) : result.netScore !== null ? (
                    <span className="text-xs text-muted-foreground">No skin (tie)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Back 9 */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">BACK 9</div>
              {results.slice(9, 18).map(result => (
                <div 
                  key={result.holeNumber}
                  className={cn(
                    "flex items-center justify-between p-2 rounded mb-1",
                    result.winnerId 
                      ? result.winnerTeam === 'US' 
                        ? "bg-[#002868]/10" 
                        : "bg-[#003399]/10"
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {result.holeNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">Par {result.par}</span>
                  </div>
                  {result.winnerId ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        result.winnerTeam === 'US' ? "text-[#002868]" : "text-[#003399]"
                      )}>
                        {result.winnerName}
                      </span>
                      <Badge 
                        variant={result.winnerTeam === 'US' ? 'us' : 'europe'}
                        className="text-xs"
                      >
                        {result.netScore}
                      </Badge>
                    </div>
                  ) : result.netScore !== null ? (
                    <span className="text-xs text-muted-foreground">No skin (tie)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Player standings */}
      <Card>
        <CardHeader>
          <CardTitle>Skins Standings</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total Pot: {formatCurrency(totalPot)} • {formatCurrency(potPerSkin)}/skin
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedSummary.map((player, idx) => (
              <div 
                key={player.playerId}
                className={cn(
                  "flex items-center justify-between p-3 rounded",
                  player.skinsWon > 0 
                    ? player.team === 'US'
                      ? "bg-[#002868]/10"
                      : "bg-[#003399]/10"
                    : "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    idx === 0 && player.skinsWon > 0 ? "bg-yellow-400 text-black" :
                    idx === 1 && player.skinsWon > 0 ? "bg-gray-300 text-black" :
                    idx === 2 && player.skinsWon > 0 ? "bg-amber-600 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className={cn(
                      "font-medium",
                      player.team === 'US' ? "text-[#002868]" : "text-[#003399]"
                    )}>
                      {player.playerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player.team === 'US' ? '🇺🇸' : '🇪🇺'} {player.skinsWon} {player.skinsWon === 1 ? 'skin' : 'skins'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {player.totalMoney > 0 ? formatCurrency(player.totalMoney) : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
