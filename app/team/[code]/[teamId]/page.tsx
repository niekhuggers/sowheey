'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { connectSocket, joinRoom, submitTeamRanking, getSocket } from '@/lib/socket-client'
import { MobileRanking } from '@/components/game/mobile-ranking'

export default function TeamPlayPage() {
  const { code, teamId } = useParams()
  const [team, setTeam] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [rankings, setRankings] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeamData()
    connectToGame()
  }, [code, teamId])

  const loadTeamData = async () => {
    try {
      // Load team info
      const teamResponse = await fetch(`/api/teams?roomId=${teamId}`)
      // This is a simplified approach - in real implementation you'd have a specific team endpoint
      
      // Load room info
      const roomResponse = await fetch(`/api/rooms?code=${code}`)
      if (!roomResponse.ok) throw new Error('Room not found')
      
      const roomData = await roomResponse.json()
      setRoom(roomData)
      setParticipants(roomData.participants || [])
      
      // Mock team data for now - you'd get this from a proper API
      setTeam({
        id: teamId,
        name: 'Your Team',
        members: roomData.participants?.slice(0, 2) || []
      })
      
    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectToGame = () => {
    try {
      connectSocket()
      const socket = getSocket()
      
      socket.on('connect', () => {
        // Generate a team device token
        const teamDeviceToken = localStorage.getItem('teamDeviceToken') || crypto.randomUUID()
        localStorage.setItem('teamDeviceToken', teamDeviceToken)
        
        joinRoom(code as string, teamDeviceToken)
      })
      
      socket.on('round-started', (round: any) => {
        setCurrentRound(round)
        setRankings([])
        setSubmitted(false)
      })
      
      socket.on('round-closed', (round: any) => {
        if (round.id === currentRound?.id) {
          setCurrentRound({ ...currentRound, status: 'CLOSED' })
        }
      })
      
      socket.on('round-revealed', (round: any) => {
        if (round.id === currentRound?.id) {
          setCurrentRound(round)
        }
      })
    } catch (error) {
      console.warn('Socket connection failed, continuing in offline mode')
    }
  }

  const handleSubmit = () => {
    if (rankings.length !== 3 || !currentRound || !team) return
    
    try {
      submitTeamRanking(
        code as string,
        currentRound.id,
        team.id, // Use team ID for team submission
        localStorage.getItem('teamDeviceToken') || '',
        {
          rank1Id: rankings[0],
          rank2Id: rankings[1],
          rank3Id: rankings[2],
        }
      )
      
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit ranking:', error)
      alert('Failed to submit ranking. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading team...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{team?.name || 'Team Play'}</h1>
          <p className="text-gray-600">Room: {code}</p>
          
          {team?.members && (
            <div className="flex justify-center gap-4 mt-2">
              {team.members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!currentRound ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-gray-600">Waiting for the host to start a round...</p>
            </CardContent>
          </Card>
        ) : currentRound.status === 'OPEN' ? (
          <Card>
            <CardHeader>
              <CardTitle>Round {currentRound.roundNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              {!submitted ? (
                <div className="space-y-6">
                  <MobileRanking
                    participants={participants.filter(p => 
                      !team?.members?.some((m: any) => m.id === p.id)
                    )}
                    rankings={rankings}
                    onRankingChange={setRankings}
                    question={{
                      text: currentRound.question?.text || '',
                      type: currentRound.question?.category === 'special' ? 'fmk' : 'normal',
                      fixedOptions: currentRound.question?.text.includes('Aylin, Keone en Ceana') 
                        ? ['Aylin', 'Keone', 'Ceana'] 
                        : undefined
                    }}
                  />
                  
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={rankings.length !== 3 || rankings.some(r => !r)}
                  >
                    Submit Team Ranking
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-semibold mb-2">
                    Team Ranking Submitted!
                  </div>
                  <p className="text-gray-600">
                    Waiting for other teams to submit their rankings...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : currentRound.status === 'CLOSED' ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-gray-600">
                Round closed. Waiting for results...
              </p>
            </CardContent>
          </Card>
        ) : currentRound.status === 'REVEALED' ? (
          <Card>
            <CardHeader>
              <CardTitle>Round {currentRound.roundNumber} Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">{currentRound.question?.text}</p>
              
              <div className="space-y-3">
                <h3 className="font-semibold">Community Top 3:</h3>
                {[
                  { rank: 1, id: currentRound.communityRank1Id },
                  { rank: 2, id: currentRound.communityRank2Id },
                  { rank: 3, id: currentRound.communityRank3Id },
                ].map(({ rank, id }) => {
                  const participant = participants.find((p) => p.id === id)
                  if (!participant) return null
                  
                  return (
                    <div key={rank} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold w-8">{rank}.</div>
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        {participant.name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{participant.name}</span>
                    </div>
                  )
                })}
              </div>
              
              <p className="text-center text-gray-600 mt-6">
                Waiting for the next round...
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}