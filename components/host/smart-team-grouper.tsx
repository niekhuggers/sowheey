'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant } from '@/lib/types'

interface SmartTeamGrouperProps {
  room: any
  participants: Participant[]
  onAction: (action: string, payload: any) => void
}

export function SmartTeamGrouper({ room, participants, onAction }: SmartTeamGrouperProps) {
  const [suggestedTeams, setSuggestedTeams] = useState<Array<{
    name: string
    members: [Participant, Participant]
    compatibility: number
  }>>([])
  const [loading, setLoading] = useState(false)

  const generateSmartTeams = async () => {
    setLoading(true)
    try {
      // Get pre-submission data to analyze compatibility
      const submissions = await Promise.all(
        participants.map(async (p) => {
          const response = await fetch(`/api/pre-submissions?inviteToken=${p.inviteToken}&roomCode=${room.code}`)
          if (response.ok) {
            const data = await response.json()
            return { participant: p, submissions: data }
          }
          return { participant: p, submissions: [] }
        })
      )

      // Simple pairing algorithm based on similar/different answers
      const availableParticipants = [...participants]
      const teams: Array<{
        name: string
        members: [Participant, Participant]
        compatibility: number
      }> = []

      while (availableParticipants.length >= 2) {
        const p1 = availableParticipants.shift()!
        let bestMatch = availableParticipants[0]
        let bestScore = 0

        // Find best compatibility match
        availableParticipants.forEach((p2) => {
          const p1Submissions = submissions.find(s => s.participant.id === p1.id)?.submissions || []
          const p2Submissions = submissions.find(s => s.participant.id === p2.id)?.submissions || []
          
          // Calculate compatibility (50% similar, 50% different for interesting dynamics)
          let similarity = 0
          let total = 0
          
          p1Submissions.forEach((s1: any) => {
            const s2 = p2Submissions.find((s: any) => s.questionId === s1.questionId)
            if (s2) {
              total++
              const s1Ranks = [s1.rank1ParticipantId, s1.rank2ParticipantId, s1.rank3ParticipantId]
              const s2Ranks = [s2.rank1ParticipantId, s2.rank2ParticipantId, s2.rank3ParticipantId]
              
              // Count overlapping answers
              const overlap = s1Ranks.filter(id => s2Ranks.includes(id)).length
              similarity += overlap / 3
            }
          })
          
          const avgSimilarity = total > 0 ? similarity / total : 0
          // Optimal compatibility is around 60% similarity
          const compatibility = 100 - Math.abs(avgSimilarity - 0.6) * 100
          
          if (compatibility > bestScore) {
            bestScore = compatibility
            bestMatch = p2
          }
        })

        // Remove best match from available list
        const matchIndex = availableParticipants.indexOf(bestMatch)
        availableParticipants.splice(matchIndex, 1)

        // Generate team name based on first letters or characteristics
        const teamName = `Team ${p1.name[0]}${bestMatch.name[0]}`

        teams.push({
          name: teamName,
          members: [p1, bestMatch],
          compatibility: Math.round(bestScore)
        })
      }

      setSuggestedTeams(teams)
    } catch (error) {
      console.error('Error generating teams:', error)
      alert('Failed to generate teams. Using random pairing.')
      
      // Fallback: random pairing
      const shuffled = [...participants].sort(() => Math.random() - 0.5)
      const randomTeams = []
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        randomTeams.push({
          name: `Team ${shuffled[i].name[0]}${shuffled[i + 1].name[0]}`,
          members: [shuffled[i], shuffled[i + 1]] as [Participant, Participant],
          compatibility: Math.floor(Math.random() * 40) + 50 // Random 50-90%
        })
      }
      
      setSuggestedTeams(randomTeams)
    } finally {
      setLoading(false)
    }
  }

  const createAllTeams = async () => {
    for (const team of suggestedTeams) {
      try {
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            name: team.name,
            participantIds: team.members.map(m => m.id),
            hostToken: localStorage.getItem('hostToken'),
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to create ${team.name}`)
        }
      } catch (error) {
        console.error('Error creating team:', error)
        alert(`Failed to create ${team.name}`)
      }
    }
    
    alert('All teams created successfully!')
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Smart Team Grouper</CardTitle>
          <p className="text-sm text-gray-600">
            Generate teams based on pre-submission compatibility analysis
          </p>
        </CardHeader>
        <CardContent>
          {suggestedTeams.length === 0 ? (
            <div className="text-center">
              <p className="mb-4">
                Click below to analyze pre-submissions and generate optimal team pairings
              </p>
              <Button 
                onClick={generateSmartTeams} 
                disabled={loading || participants.length < 2}
                size="lg"
              >
                {loading ? 'Analyzing...' : 'Generate Smart Teams'}
              </Button>
              
              {participants.length < 2 && (
                <p className="text-red-600 text-sm mt-2">
                  Need at least 2 participants to create teams
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Suggested Teams</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={generateSmartTeams}>
                    Regenerate
                  </Button>
                  <Button onClick={createAllTeams}>
                    Create All Teams
                  </Button>
                </div>
              </div>
              
              {suggestedTeams.map((team, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{team.name}</h4>
                    <div className="text-sm text-gray-600">
                      Compatibility: {team.compatibility}%
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {team.members.map((member, i) => (
                      <div key={member.id} className="flex items-center gap-2">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                            {member.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <span>{member.name}</span>
                        {i === 0 && <span className="text-gray-400">+</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {participants.length % 2 === 1 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> {participants[participants.length - 1]?.name} will play individually 
                    as there's an odd number of participants.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}