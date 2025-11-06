'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MobileRanking } from '@/components/game/mobile-ranking'
import { connectSocket, joinRoom, getSocket } from '@/lib/socket-client'

// HARDCODED DATA
const PLAYERS = ['Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny']
const HOSTS = ['Niek', 'Joep', 'Merijn']
const ALL_PEOPLE = [...PLAYERS, ...HOSTS]

const QUESTIONS = [
  { text: 'Wie gaan nooit trouwen?', type: 'ranking' },
  { text: 'Wie heeft de minste ambitie?', type: 'ranking' }, 
  { text: 'Wie zegt het vaakst last minute af?', type: 'ranking' },
  { text: 'Wie zijn gedoemd om irritante kinderen te krijgen?', type: 'ranking' },
  { text: 'Wie belanden later in de gevangenis?', type: 'ranking' },
  { text: 'Wie denken dat ze slim zijn, maar zijn het niet?', type: 'ranking' },
  { text: 'Wie zijn het irritantst als ze dronken zijn?', type: 'ranking' },
  { text: 'Wie verlaat altijd als laatste het huis?', type: 'ranking' },
  { text: 'Wie heeft het grootste ego zonder reden?', type: 'ranking' },
  { text: 'Wie gebruikt het meeste drugs?', type: 'ranking' },
  { text: 'Wie zou stand-up comedian kunnen zijn?', type: 'ranking' },
  { text: 'Wie trouwt met een veel jongere partner?', type: 'ranking' },
  { text: 'Wie zou je peetoom van je kind maken?', type: 'ranking' },
  { text: 'Wie poept het meest?', type: 'ranking' },
  { text: 'Fuck, Marry, Kill: Aylin, Keone en Ceana', type: 'fmk', fixedOptions: ['Aylin', 'Keone', 'Ceana'] }
]

// Helper functions for processing pre-filled answers

const calculateCommunityRanking = (questionIndex: number, prefilledAnswers: any): string[] => {
  if (!prefilledAnswers) {
    // Fallback to hardcoded answers if no prefilled data
    const hardcodedFallback = [
      ['Tim', 'Niek', 'Yanick'], ['Maurits', 'Sunny', 'Stijn'], ['Joep', 'Thijs', 'Rutger'],
      ['Tijn', 'Stijn', 'Joep'], ['Stijn', 'Joep', 'Keith'], ['Keith', 'Merijn', 'Tijn'],
      ['Keith', 'Niek', 'Rutger'], ['Thijs', 'Stijn', 'Yanick'], ['Tijn', 'Niek', 'Casper'],
      ['Merijn', 'Sunny', 'Stijn'], ['Rutger', 'Casper', 'Sunny'], ['Niek', 'Tijn', 'Tim'],
      ['Niek', 'Yanick', 'Thijs'], ['Tijn', 'Stijn', 'Thijs'], ['Aylin', 'Keone', 'Ceana']
    ]
    return hardcodedFallback[questionIndex] || []
  }

  // Count votes for each person at each position
  const positionScores: { [person: string]: number } = {}
  
  Object.keys(prefilledAnswers).forEach(person => {
    const personAnswers = prefilledAnswers[person]
    if (personAnswers && personAnswers[questionIndex]) {
      const ranking = personAnswers[questionIndex]
      // Award points: 3 for 1st place, 2 for 2nd, 1 for 3rd
      ranking.forEach((rankedPerson: string, index: number) => {
        if (rankedPerson && typeof rankedPerson === 'string') {
          const points = Math.max(0, 3 - index) // 3, 2, 1, 0, 0, ...
          positionScores[rankedPerson] = (positionScores[rankedPerson] || 0) + points
        }
      })
    }
  })

  // Sort by total score to get community ranking
  const sortedRanking = Object.entries(positionScores)
    .sort((a, b) => b[1] - a[1]) // Sort by score descending
    .map(([person]) => person)
    .slice(0, 3) // Take top 3

  return sortedRanking
}

const calculateTeamScore = (teamRanking: string[], communityRanking: string[]): number => {
  let score = 0
  
  teamRanking.forEach((person, teamIndex) => {
    const communityIndex = communityRanking.indexOf(person)
    if (communityIndex !== -1) {
      // Award 1 point for being in the community top 3
      score += 1
      
      // Award extra points for exact position matches
      if (communityIndex === teamIndex) {
        if (teamIndex === 0) score += 3 // 1st place match
        else if (teamIndex === 1) score += 2 // 2nd place match  
        else if (teamIndex === 2) score += 1 // 3rd place match
      }
    }
  })
  
  return score
}

function PlayGameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomCode, setRoomCode] = useState('')
  const [teamId, setTeamId] = useState<number | null>(null)
  const [gameState, setGameState] = useState<any>(null)
  const [rankings, setRankings] = useState<string[]>([])
  const [fmkAnswers, setFmkAnswers] = useState<{[key: string]: string}>({})
  const [submitted, setSubmitted] = useState(false)
  const [team, setTeam] = useState<any>(null)
  const [deviceToken, setDeviceToken] = useState<string>('')

  useEffect(() => {
    // Always auto-join WEEKEND2024 - this app is only for this room
    setRoomCode('WEEKEND2024')
    loadGameState('WEEKEND2024')

    // Generate or get existing device token
    let token = localStorage.getItem('deviceToken')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('deviceToken', token)
    }
    setDeviceToken(token)

    // Check if team already selected
    const savedTeamId = localStorage.getItem('selectedTeamId')
    if (savedTeamId) {
      setTeamId(parseInt(savedTeamId))
    }
    
    // Connect to Socket.IO and set up event listeners
    connectSocket()
    const socket = getSocket()
    
    // Listen for round events
    socket.on('round-started', (round: any) => {
      console.log('Round started:', round)
      setGameState((prev: any) => prev ? { 
        ...prev, 
        roundStatus: 'active',
        currentRound: round.roundNumber - 1 
      } : prev)
      setSubmitted(false)
      setRankings([])
      setFmkAnswers({})
    })
    
    socket.on('round-closed', (round: any) => {
      console.log('Round closed:', round)
      setGameState((prev: any) => prev ? { ...prev, roundStatus: 'revealing' } : prev)
    })
    
    socket.on('round-revealed', (round: any) => {
      console.log('Round revealed:', round)
      setGameState((prev: any) => prev ? { ...prev, roundStatus: 'revealing' } : prev)
    })
    
    socket.on('game-completed', () => {
      console.log('Game completed')
      setGameState((prev: any) => prev ? { ...prev, roundStatus: 'completed' } : prev)
    })
    
    // Join room when socket is connected
    socket.on('connect', () => {
      console.log('Socket connected, joining room WEEKEND2024 with device token')
      if (token) {
        joinRoom('WEEKEND2024', token)
      }
    })
    
    return () => {
      socket.off('round-started')
      socket.off('round-closed')
      socket.off('round-revealed')
      socket.off('game-completed')
      socket.off('connect')
    }
  }, [])

  const loadGameState = async (code: string) => {
    try {
      // First try to load from database
      const response = await fetch(`/api/rooms?code=${code}`)
      if (response.ok) {
        const roomData = await response.json()
        
        // Load teams from database
        let teams = []
        try {
          console.log('Loading teams for room:', roomData.id)
          const teamsResponse = await fetch(`/api/teams?roomId=${roomData.id}`)
          console.log('Teams response status:', teamsResponse.status)
          
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json()
            console.log('Raw teams data:', teamsData)
            
            // Transform database teams to match expected format
            teams = teamsData.map((team: any) => ({
              id: team.id,
              name: team.name,
              members: team.members.map((member: any) => member.participant.name),
              score: team.aggregateScores?.[0]?.totalScore || 0
            }))
            console.log('Transformed teams:', teams)
          } else {
            console.error('Failed to fetch teams:', await teamsResponse.text())
          }
        } catch (error) {
          console.error('Error loading teams:', error)
        }
        
        const gameState = {
          isSetup: true,
          currentRound: 0,
          roundStatus: 'waiting',
          teams: teams,
          roomCode: code,
          answersPrefilled: false,
          roomId: roomData.id,
          participants: roomData.participants,
          questions: roomData.questions
        }
        console.log('Setting game state with teams:', gameState.teams)
        setGameState(gameState)
        return
      } else if (response.status === 404 && code === 'WEEKEND2024') {
        // WEEKEND2024 room doesn't exist, try to create it
        console.log('WEEKEND2024 room not found, creating it...')
        try {
          const createResponse = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Friends Weekend Game',
              code: 'WEEKEND2024',
              participants: ALL_PEOPLE.map(name => ({
                name,
                isHost: HOSTS.includes(name),
                isGuest: false
              })),
              questions: QUESTIONS.map((q, index) => ({
                text: q.text,
                category: q.text.includes('Fuck, Marry, Kill') ? 'special' : 'general',
                sortOrder: index
              }))
            })
          })
          
          if (createResponse.ok) {
            console.log('WEEKEND2024 room created, retrying load...')
            // Retry loading the room
            return loadGameState(code)
          }
        } catch (createError) {
          console.error('Error creating WEEKEND2024 room:', createError)
        }
      }
    } catch (error) {
      console.error('Error loading room from database:', error)
    }

    
    // If no valid game state, redirect to main page
    router.push('/')
  }

  const joinGame = () => {
    const codeToUse = roomCode.trim() || 'WEEKEND2024'
    loadGameState(codeToUse.toUpperCase())
  }

  const selectTeam = (selectedTeamId: number) => {
    setTeamId(selectedTeamId)
    localStorage.setItem('selectedTeamId', selectedTeamId.toString())
    
    const selectedTeam = gameState.teams.find((t: any) => t.id === selectedTeamId)
    setTeam(selectedTeam)
  }

  const clearTeamSelection = () => {
    setTeamId(null)
    setTeam(null)
    localStorage.removeItem('selectedTeamId')
  }

  const handlePersonSelect = (person: string) => {
    if (rankings.includes(person)) {
      setRankings(rankings.filter(p => p !== person))
    } else if (rankings.length < 3) {
      setRankings([...rankings, person])
    }
  }

  const handleFMKSelect = (person: string, action: string) => {
    setFmkAnswers(prev => {
      const newFmk = { ...prev }
      
      // Remove this action from any other person
      Object.keys(newFmk).forEach(p => {
        if (newFmk[p] === action) {
          delete newFmk[p]
        }
      })
      
      // Set this person to this action
      newFmk[person] = action
      
      return newFmk
    })
  }

  const submitRanking = () => {
    const currentQuestion = QUESTIONS[gameState.currentRound]
    const isFMKQuestion = currentQuestion.type === 'fmk'
    
    if (rankings.length !== 3) return

    // Get community ranking for scoring
    const communityRanking = calculateCommunityRanking(gameState.currentRound, null)
    
    // Calculate team's score for this round
    const teamRanking = rankings
    const roundScore = calculateTeamScore(teamRanking, communityRanking)

    // TODO: Submit to database via API instead of localStorage
    
    setSubmitted(true)
  }

  // TODO: Replace localStorage polling with Socket.IO real-time updates

  // Join Room
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">🌟 Ranking the Stars</CardTitle>
            <p className="text-center text-gray-600">
              Loading weekend game...
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Room Code
              </label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="WEEKEND2024 (default)"
                className="text-center text-lg font-mono"
                maxLength={12}
              />
            </div>
            
            <Button
              onClick={joinGame}
              className="w-full"
              size="lg"
            >
              Join Game
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Leave empty to use default weekend room (WEEKEND2024)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Team Selection
  if (!teamId) {
    console.log('Team selection screen - teams available:', gameState.teams)
    console.log('Number of teams:', gameState.teams?.length)
    
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">👥 Selecteer je Team</h1>
            <p className="text-gray-600">Room: {gameState.roomCode}</p>
            <p className="text-sm text-gray-500">Teams found: {gameState.teams?.length || 0}</p>
            {process.env.NODE_ENV === 'development' && (
              <Button 
                onClick={clearTeamSelection} 
                variant="secondary" 
                size="sm"
                className="mt-2"
              >
                🔄 Reset Team Selection (Debug)
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {gameState.teams?.length > 0 ? gameState.teams.map((team: any) => (
              <Card key={team.id} className="cursor-pointer hover:bg-gray-50" onClick={() => selectTeam(team.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-lg">{team.name}</div>
                      <div className="text-gray-600">
                        {team.members.join(' + ')}
                      </div>
                    </div>
                    <div className="text-2xl">👥</div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center p-8">
                <p className="text-gray-500 mb-4">No teams found</p>
                <p className="text-sm text-gray-400">Teams need to be created in the admin panel first</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = QUESTIONS[gameState.currentRound]
  const isFMKQuestion = currentQuestion.type === 'fmk'
  const availablePeople = ALL_PEOPLE.filter(p => !team?.members.includes(p))
  
  // Convert people to participant format for MobileRanking component
  const participantsForRanking = availablePeople.map(person => ({
    id: person,
    name: person,
    avatarUrl: undefined,
    inviteToken: '',
    isGuest: false,
    createdAt: new Date()
  }))

  // Game Play
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Team Info */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">{team?.name}</h1>
          <p className="text-gray-600">{team?.members.join(' + ')} • Room: {gameState.roomCode}</p>
          <Button 
            onClick={clearTeamSelection}
            variant="secondary"
            size="sm"
            className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            🚪 Leave Team
          </Button>
        </div>

        {gameState.roundStatus === 'waiting' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-xl font-medium mb-2">Waiting for next round...</h2>
              <p className="text-gray-600">Round {gameState.currentRound + 1} / {QUESTIONS.length}</p>
            </CardContent>
          </Card>
        )}

        {gameState.roundStatus === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Round {gameState.currentRound + 1} / {QUESTIONS.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!submitted ? (
                <div className="space-y-6">
                  {/* Question */}
                  <div className="text-lg font-medium text-center p-4 bg-blue-50 rounded-lg">
                    {currentQuestion.text}
                  </div>

                  <MobileRanking
                    participants={participantsForRanking}
                    onRankingChange={(newRankings) => {
                      if (isFMKQuestion) {
                        // Convert rankings array to fmk format
                        const newFmkAnswers: {[key: string]: string} = {}
                        const fmkActions = ['Fuck', 'Marry', 'Kill']
                        newRankings.forEach((person, index) => {
                          if (person && index < 3) {
                            newFmkAnswers[person] = fmkActions[index]
                          }
                        })
                        setFmkAnswers(newFmkAnswers)
                        setRankings(newRankings)
                      } else {
                        setRankings(newRankings)
                      }
                    }}
                    rankings={rankings}
                    question={currentQuestion}
                  />

                  <Button
                    onClick={submitRanking}
                    disabled={rankings.length !== 3}
                    className="w-full"
                    size="lg"
                  >
                    Submit Team Ranking
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-xl font-medium mb-2">Ranking Submitted!</h2>
                  <p className="text-gray-600">Waiting for results...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {gameState.roundStatus === 'revealing' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Round {gameState.currentRound + 1} Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-lg font-medium">{currentQuestion.text}</div>
                
                <div className="text-4xl">🎉</div>
                
                <div>
                  <h3 className="font-medium mb-2">Community Top 3:</h3>
                  <div className="space-y-2">
                    {(() => {
                      // Calculate community ranking for this round
                      const communityRanking = calculateCommunityRanking(gameState.currentRound, null)
                      
                      return communityRanking.map((person, index) => (
                        <div key={person} className="flex items-center justify-center space-x-2">
                          <span className="text-2xl">{['🥇', '🥈', '🥉'][index]}</span>
                          <span className="font-medium">{person}</span>
                          {HOSTS.includes(person) && <span>👑</span>}
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Your Team's Answer */}
                {rankings.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Your Team's Answer:</h3>
                    <div className="space-y-1">
                      {rankings.slice(0, 3).map((person, index) => (
                        <div key={person} className="flex items-center justify-center space-x-2">
                          <span className="text-lg">{index + 1}.</span>
                          <span className="font-medium">{person}</span>
                          {HOSTS.includes(person) && <span>👑</span>}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calculate and show score */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-700">
                        Points: {(() => {
                          const communityRanking = calculateCommunityRanking(gameState.currentRound, null)
                          const teamScore = calculateTeamScore(rankings.slice(0, 3), communityRanking)
                          return teamScore
                        })()}
                      </div>
                      <div className="text-sm text-blue-600">
                        +1 for each person in community top 3, +2 bonus for exact position
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  Next round starting soon...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {gameState.roundStatus === 'completed' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold mb-2">Game Completed!</h2>
              <p className="text-gray-600">Thanks for playing Ranking the Stars!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function PlayGame() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <PlayGameContent />
    </Suspense>
  )
}