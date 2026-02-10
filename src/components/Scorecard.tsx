'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface HoleData {
  number: number
  par: number
  yardage: number
  handicap: number  // Stroke index
}

interface PlayerScore {
  playerId: string
  playerName: string
  team: 'US' | 'EUROPE'
  courseHandicap: number
  playingHandicap: number  // Strokes received
  scores: (number | null)[]  // 18 holes, null if not yet entered
  strokeHoles: number[]  // Which holes they get a stroke on
}

interface ScorecardProps {
  courseName: string
  teeName: string
  holes: HoleData[]
  players: PlayerScore[]
  onScoreChange?: (playerId: string, holeNumber: number, score: number) => void
  readOnly?: boolean
  showBestBall?: boolean  // For Fourball format
}

export function Scorecard({
  courseName,
  teeName,
  holes,
  players,
  onScoreChange,
  readOnly = false,
  showBestBall = false
}: ScorecardProps) {
  // Split holes into front 9 and back 9
  const front9 = holes.filter(h => h.number <= 9).sort((a, b) => a.number - b.number)
  const back9 = holes.filter(h => h.number > 9).sort((a, b) => a.number - b.number)
  
  // Calculate totals
  const calculateTotal = (scores: (number | null)[], startHole: number, endHole: number) => {
    return scores
      .slice(startHole - 1, endHole)
      .reduce((sum: number, s) => sum + (s ?? 0), 0)
  }
  
  // Get score styling based on relation to par
  const getScoreStyle = (score: number | null, par: number, hasStroke: boolean) => {
    if (score === null) return ''
    const netScore = hasStroke ? score - 1 : score
    const diff = netScore - par
    
    if (diff <= -2) return 'bg-yellow-400 text-black font-bold'  // Eagle or better
    if (diff === -1) return 'bg-green-500 text-white'  // Birdie
    if (diff === 0) return 'bg-gray-100'  // Par
    if (diff === 1) return 'bg-red-100 text-red-800'  // Bogey
    return 'bg-red-200 text-red-900'  // Double+
  }
  
  // Calculate best ball for a team
  const calculateBestBall = (teamPlayers: PlayerScore[], holeNum: number) => {
    const scores = teamPlayers.map(p => {
      const gross = p.scores[holeNum - 1]
      if (gross === null) return null
      const hasStroke = p.strokeHoles.includes(holeNum)
      return hasStroke ? gross - 1 : gross
    }).filter(s => s !== null) as number[]
    
    return scores.length > 0 ? Math.min(...scores) : null
  }
  
  // Render a 9-hole section
  const renderNineHoles = (nineHoles: HoleData[], label: string) => {
    const startHole = nineHoles[0]?.number ?? 1
    const endHole = nineHoles[nineHoles.length - 1]?.number ?? 9
    
    const usPlayers = players.filter(p => p.team === 'US')
    const europePlayers = players.filter(p => p.team === 'EUROPE')
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Hole numbers */}
            <tr className="bg-primary text-primary-foreground">
              <th className="p-2 text-left w-32">{label}</th>
              {nineHoles.map(hole => (
                <th key={hole.number} className="p-2 w-12 text-center">
                  {hole.number}
                </th>
              ))}
              <th className="p-2 w-14 text-center bg-primary/80">
                {label === 'FRONT' ? 'OUT' : 'IN'}
              </th>
            </tr>
            
            {/* Yardage */}
            <tr className="bg-muted">
              <td className="p-2 text-xs text-muted-foreground">{teeName}</td>
              {nineHoles.map(hole => (
                <td key={hole.number} className="p-1 text-center text-xs">
                  {hole.yardage}
                </td>
              ))}
              <td className="p-1 text-center text-xs font-medium">
                {nineHoles.reduce((sum, h) => sum + h.yardage, 0)}
              </td>
            </tr>
            
            {/* Par */}
            <tr className="bg-muted/50">
              <td className="p-2 font-medium">Par</td>
              {nineHoles.map(hole => (
                <td key={hole.number} className="p-2 text-center font-medium">
                  {hole.par}
                </td>
              ))}
              <td className="p-2 text-center font-medium">
                {nineHoles.reduce((sum, h) => sum + h.par, 0)}
              </td>
            </tr>
            
            {/* Handicap (stroke index) */}
            <tr className="bg-muted/30 text-xs">
              <td className="p-2 text-muted-foreground">HDCP</td>
              {nineHoles.map(hole => (
                <td key={hole.number} className="p-1 text-center text-muted-foreground">
                  {hole.handicap}
                </td>
              ))}
              <td></td>
            </tr>
          </thead>
          
          <tbody>
            {/* US Players */}
            {usPlayers.map((player, idx) => (
              <tr 
                key={player.playerId} 
                className={cn(
                  "border-t",
                  idx === 0 && "border-t-2 border-[#002868]"
                )}
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🇺🇸</span>
                    <div>
                      <div className="font-medium text-[#002868]">{player.playerName}</div>
                      <div className="text-xs text-muted-foreground">
                        ({player.playingHandicap > 0 ? player.playingHandicap : 0})
                      </div>
                    </div>
                  </div>
                </td>
                {nineHoles.map(hole => {
                  const score = player.scores[hole.number - 1]
                  const hasStroke = player.strokeHoles.includes(hole.number)
                  return (
                    <td key={hole.number} className="p-1 text-center">
                      <div className="relative">
                        {readOnly ? (
                          <span className={cn(
                            "inline-block w-8 h-8 leading-8 rounded",
                            getScoreStyle(score, hole.par, hasStroke)
                          )}>
                            {score ?? '-'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            max="15"
                            value={score ?? ''}
                            onChange={(e) => onScoreChange?.(
                              player.playerId, 
                              hole.number, 
                              parseInt(e.target.value) || 0
                            )}
                            className={cn(
                              "w-10 h-8 text-center rounded border",
                              getScoreStyle(score, hole.par, hasStroke)
                            )}
                          />
                        )}
                        {hasStroke && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full" 
                                title="Stroke received" />
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="p-2 text-center font-semibold bg-muted/30">
                  {calculateTotal(player.scores, startHole, endHole) || '-'}
                </td>
              </tr>
            ))}
            
            {/* US Best Ball */}
            {showBestBall && usPlayers.length > 1 && (
              <tr className="border-t bg-[#002868]/10">
                <td className="p-2 font-medium text-[#002868]">USA Best Ball</td>
                {nineHoles.map(hole => {
                  const bestBall = calculateBestBall(usPlayers, hole.number)
                  return (
                    <td key={hole.number} className="p-2 text-center font-semibold text-[#002868]">
                      {bestBall ?? '-'}
                    </td>
                  )
                })}
                <td className="p-2 text-center font-bold text-[#002868] bg-[#002868]/20">
                  {nineHoles.reduce((sum, h) => sum + (calculateBestBall(usPlayers, h.number) ?? 0), 0) || '-'}
                </td>
              </tr>
            )}
            
            {/* Europe Players */}
            {europePlayers.map((player, idx) => (
              <tr 
                key={player.playerId} 
                className={cn(
                  "border-t",
                  idx === 0 && "border-t-2 border-[#003399]"
                )}
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🇪🇺</span>
                    <div>
                      <div className="font-medium text-[#003399]">{player.playerName}</div>
                      <div className="text-xs text-muted-foreground">
                        ({player.playingHandicap > 0 ? player.playingHandicap : 0})
                      </div>
                    </div>
                  </div>
                </td>
                {nineHoles.map(hole => {
                  const score = player.scores[hole.number - 1]
                  const hasStroke = player.strokeHoles.includes(hole.number)
                  return (
                    <td key={hole.number} className="p-1 text-center">
                      <div className="relative">
                        {readOnly ? (
                          <span className={cn(
                            "inline-block w-8 h-8 leading-8 rounded",
                            getScoreStyle(score, hole.par, hasStroke)
                          )}>
                            {score ?? '-'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            max="15"
                            value={score ?? ''}
                            onChange={(e) => onScoreChange?.(
                              player.playerId, 
                              hole.number, 
                              parseInt(e.target.value) || 0
                            )}
                            className={cn(
                              "w-10 h-8 text-center rounded border",
                              getScoreStyle(score, hole.par, hasStroke)
                            )}
                          />
                        )}
                        {hasStroke && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full"
                                title="Stroke received" />
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="p-2 text-center font-semibold bg-muted/30">
                  {calculateTotal(player.scores, startHole, endHole) || '-'}
                </td>
              </tr>
            ))}
            
            {/* Europe Best Ball */}
            {showBestBall && europePlayers.length > 1 && (
              <tr className="border-t bg-[#003399]/10">
                <td className="p-2 font-medium text-[#003399]">EUR Best Ball</td>
                {nineHoles.map(hole => {
                  const bestBall = calculateBestBall(europePlayers, hole.number)
                  return (
                    <td key={hole.number} className="p-2 text-center font-semibold text-[#003399]">
                      {bestBall ?? '-'}
                    </td>
                  )
                })}
                <td className="p-2 text-center font-bold text-[#003399] bg-[#003399]/20">
                  {nineHoles.reduce((sum, h) => sum + (calculateBestBall(europePlayers, h.number) ?? 0), 0) || '-'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Course header */}
      <div className="text-center">
        <h3 className="text-xl font-bold">{courseName}</h3>
        <p className="text-muted-foreground">{teeName} Tees</p>
      </div>
      
      {/* Front 9 */}
      <div className="border rounded-lg overflow-hidden">
        {renderNineHoles(front9, 'FRONT')}
      </div>
      
      {/* Back 9 */}
      <div className="border rounded-lg overflow-hidden">
        {renderNineHoles(back9, 'BACK')}
      </div>
    </div>
  )
}
