'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant } from '@/lib/types'

interface WeekendTeamManagerProps {
  room: any
  participants: Participant[]
  onComplete: () => void
}

export function WeekendTeamManager({ room, participants, onComplete }: WeekendTeamManagerProps) {
  const [teams, setTeams] = useState<Array<{
    name: string
    members: [Participant, Participant]
    playLink: string
  }>>([])
  const [loading, setLoading] = useState(false)

  const generateTeamsWithLinks = async () => {
    setLoading(true)
    
    try {
      // Generate smart teams first
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

      // Smart pairing algorithm - exclude hosts from team assignment
      const availableParticipants = participants.filter(p => !(p as any).isHost)
      const newTeams: Array<{
        name: string
        members: [Participant, Participant]
        playLink: string
      }> = []

      let teamCounter = 1

      while (availableParticipants.length >= 2) {
        const p1 = availableParticipants.shift()!
        let bestMatch = availableParticipants[0]
        let bestScore = 0

        // Find best compatibility
        availableParticipants.forEach((p2) => {
          const p1Submissions = submissions.find(s => s.participant.id === p1.id)?.submissions || []
          const p2Submissions = submissions.find(s => s.participant.id === p2.id)?.submissions || []
          
          let similarity = 0
          let total = 0
          
          p1Submissions.forEach((s1: any) => {
            const s2 = p2Submissions.find((s: any) => s.questionId === s1.questionId)
            if (s2) {
              total++
              const s1Ranks = [s1.rank1ParticipantId, s1.rank2ParticipantId, s1.rank3ParticipantId]
              const s2Ranks = [s2.rank1ParticipantId, s2.rank2ParticipantId, s2.rank3ParticipantId]
              
              const overlap = s1Ranks.filter(id => s2Ranks.includes(id)).length
              similarity += overlap / 3
            }
          })
          
          const avgSimilarity = total > 0 ? similarity / total : 0
          const compatibility = 100 - Math.abs(avgSimilarity - 0.6) * 100
          
          if (compatibility > bestScore) {
            bestScore = compatibility
            bestMatch = p2
          }
        })

        // Remove from available
        const matchIndex = availableParticipants.indexOf(bestMatch)
        availableParticipants.splice(matchIndex, 1)

        // Create team in database
        const teamResponse = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            name: `Team ${teamCounter}`,
            participantIds: [p1.id, bestMatch.id],
            hostToken: localStorage.getItem('hostToken'),
          }),
        })

        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          
          // Generate team play link
          const playLink = `${window.location.origin}/team/${room.code}/${teamData.id}`
          
          newTeams.push({
            name: `Team ${teamCounter}`,
            members: [p1, bestMatch],
            playLink
          })
          
          teamCounter++
        }
      }

      setTeams(newTeams)
    } catch (error) {
      console.error('Error generating teams:', error)
      alert('Failed to generate teams')
    } finally {
      setLoading(false)
    }
  }

  const copyAllLinks = () => {
    const allLinks = teams.map(team => 
      `${team.name}: ${team.playLink}`
    ).join('\n\n')
    
    navigator.clipboard.writeText(allLinks)
    alert('All team links copied to clipboard!')
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    alert('Team link copied!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stap 2: Genereer Teams met Play Links</CardTitle>
          <p className="text-gray-600">
            Maak slimme teams op basis van de ingevulde antwoorden en genereer unieke links per team
          </p>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center">
              <Button
                onClick={generateTeamsWithLinks}
                disabled={loading}
                size="lg"
              >
                {loading ? 'Generating Teams...' : 'Generate Teams & Links'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Generated Teams</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={copyAllLinks}>
                    Copy All Links
                  </Button>
                  <Button onClick={onComplete}>
                    Continue to Game →
                  </Button>
                </div>
              </div>
              
              {teams.map((team, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{team.name}</h4>
                    </div>
                    
                    <div className="flex gap-4 mb-4">
                      {team.members.map((member, i) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                            {member.name[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{member.name}</span>
                          {i === 0 && <span className="text-gray-400 mx-2">+</span>}
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-1">Team Play Link:</p>
                          <code className="text-sm bg-white px-2 py-1 rounded border">
                            {team.playLink}
                          </code>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => copyLink(team.playLink)}
                          className="ml-3"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">🎉 Teams Ready!</h4>
                <p className="text-green-700 text-sm">
                  Stuur elke team hun unieke link. Ze kunnen dan samen spelen vanaf 1 telefoon per team.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}