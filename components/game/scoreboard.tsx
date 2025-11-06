'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ScoreboardProps {
  roomCode: string
}

interface ScoreData {
  participants: Array<{
    id: string
    name: string
    avatarUrl?: string
    totalScore: number
    rank: number
  }>
  teams: Array<{
    id: string
    name: string
    totalScore: number
    rank: number
    members: Array<{
      name: string
      avatarUrl?: string
    }>
  }>
}

export function Scoreboard({ roomCode }: ScoreboardProps) {
  const [view, setView] = useState<'individual' | 'team'>('individual')
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadScores()
    const interval = setInterval(loadScores, 5000)
    return () => clearInterval(interval)
  }, [roomCode])

  const loadScores = async () => {
    try {
      const response = await fetch(`/api/scores?roomCode=${roomCode}`)
      const data = await response.json()
      setScores(data)
    } catch (error) {
      console.error('Failed to load scores:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading scores...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        <Button
          variant={view === 'individual' ? 'primary' : 'secondary'}
          onClick={() => setView('individual')}
        >
          Individual Scores
        </Button>
        <Button
          variant={view === 'team' ? 'primary' : 'secondary'}
          onClick={() => setView('team')}
        >
          Team Scores
        </Button>
      </div>

      {view === 'individual' && scores?.participants && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-100' : index === 2 ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-lg">
                      {participant.rank}
                    </div>
                    {participant.avatarUrl ? (
                      <img
                        src={participant.avatarUrl}
                        alt={participant.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        {participant.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{participant.name}</span>
                  </div>
                  <div className="text-xl font-bold">{participant.totalScore}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'team' && scores?.teams && (
        <Card>
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.teams.map((team, index) => (
                <div
                  key={team.id}
                  className={`p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-100' : index === 2 ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center font-bold text-lg">
                        {team.rank}
                      </div>
                      <span className="font-semibold text-lg">{team.name}</span>
                    </div>
                    <div className="text-xl font-bold">{team.totalScore}</div>
                  </div>
                  <div className="ml-11 flex gap-4 text-sm text-gray-600">
                    {team.members.map((member, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                            {member.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}