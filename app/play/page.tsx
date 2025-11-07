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
      
      // Award +2 bonus for exact position match (ANY position)
      if (communityIndex === teamIndex) {
        score += 2 // Matches server logic: total 3 points for exact match
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
        currentRound: round.roundNumber - 1,
        currentRoundData: round
      } : prev)
      setSubmitted(false)
      setRankings([])
      setFmkAnswers({})
    })
    
    socket.on('round-closed', (round: any) => {
      console.log('Round closed:', round)
      setGameState((prev: any) => prev ? { ...prev, roundStatus: 'revealing' } : prev)
    })
    
    socket.on('round-revealed', (data: any) => {
      console.log('Round revealed, reloading to show updated scores:', data)
      // Reload game state to show updated team scores
      setTimeout(async () => {
        console.log('⏳ Reloading game state to get scores...')
        await loadGameState('WEEKEND2024')
        console.log('✅ Game state reloaded after reveal')
      }, 2000) // Wait for scores to be saved to database
    })
    
    socket.on('game-completed', () => {
      console.log('Game completed')
      setGameState((prev: any) => prev ? { ...prev, roundStatus: 'completed' } : prev)
    })
    
    socket.on('rounds-reset', (data: any) => {
      console.log('🔄 Rounds reset by admin, reloading game state...', data)
      // Reload the game state from database
      loadGameState('WEEKEND2024')
      // Reset submission state
      setSubmitted(false)
      setRankings([])
      setFmkAnswers({})
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
      socket.off('rounds-reset')
      socket.off('connect')
    }
  }, [])

  const loadGameState = async (code: string) => {
    try {
      // Load complete game state from the same API that admin uses
      const response = await fetch(`/api/game-state?roomCode=${code}`)
      if (response.ok) {
        const gameStateData = await response.json()
        
        console.log('Play page loaded game state:', gameStateData)
        
        // Map database game state to play page state (same as admin)
        const roundStatus = (() => {
          if (gameStateData.room.gameState === 'SETUP' || gameStateData.room.gameState === 'PRE_EVENT') {
            return 'waiting'
          }
          
          const currentRound = gameStateData.rounds[gameStateData.room.currentRound]
          if (!currentRound) return 'waiting'
          
          switch (currentRound.status) {
            case 'ACTIVE': return 'active'
            case 'CLOSED': return 'revealing'
            case 'REVEALED': return 'waiting' // Ready for next round
            default: return 'waiting'
          }
        })()
        
        const currentRoundData = gameStateData.rounds[gameStateData.room.currentRound]
        
        const gameState = {
          isSetup: true,
          currentRound: gameStateData.room.currentRound,
          roundStatus: roundStatus,
          teams: gameStateData.teams,
          roomCode: code,
          answersPrefilled: gameStateData.room.gameState !== 'SETUP',
          roomId: gameStateData.room.id,
          participants: gameStateData.participants,
          questions: gameStateData.questions,
          currentRoundData: currentRoundData,
          rounds: gameStateData.rounds
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

  const selectTeam = async (selectedTeamId: number) => {
    try {
      // Check if team already has a device paired
      const response = await fetch('/api/team-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          deviceToken: deviceToken,
          roomCode: 'WEEKEND2024'
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to join team')
        return
      }
      
      setTeamId(selectedTeamId)
      localStorage.setItem('selectedTeamId', selectedTeamId.toString())
      
      const selectedTeam = gameState.teams.find((t: any) => t.id === selectedTeamId)
      setTeam(selectedTeam)
    } catch (error) {
      console.error('Error joining team:', error)
      alert('Failed to join team')
    }
  }

  const clearTeamSelection = async () => {
    try {
      // Unpair device from team in database
      await fetch('/api/team-pairing/unpair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: deviceToken
        })
      })
    } catch (error) {
      console.error('Failed to unpair device:', error)
    }
    
    // Clear local state regardless of API success
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
    
    if (rankings.length !== 3) {
      alert('Please select 3 people before submitting')
      return
    }

    if (!gameState.currentRoundData?.id) {
      alert('No active round found')
      return
    }

    // Get participant IDs for the rankings
    const participantMap = new Map(
      gameState.participants?.map((p: any) => [p.name, p.id]) || []
    )

    const rank1Id = participantMap.get(rankings[0])
    const rank2Id = participantMap.get(rankings[1])
    const rank3Id = participantMap.get(rankings[2])

    if (!rank1Id || !rank2Id || !rank3Id) {
      alert('Could not find participant IDs for selected rankings')
      return
    }

    // Submit via Socket.IO
    const socket = getSocket()
    
    if (!socket || !socket.connected) {
      alert('Not connected to server. Please refresh and try again.')
      return
    }

    socket.emit('submit-ranking', {
      roomCode: gameState.roomCode,
      roundId: gameState.currentRoundData.id,
      teamId: teamId,
      deviceToken: deviceToken,
      rankings: {
        rank1Id,
        rank2Id,
        rank3Id
      }
    })

    console.log('✅ Submission sent to server for team', teamId)
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
                      // Get REAL community ranking from the revealed round data
                      const revealedRound = gameState.rounds?.[gameState.currentRound]
                      
                      if (revealedRound?.communityRank1Id && gameState.participants) {
                        const rank1 = gameState.participants.find((p: any) => p.id === revealedRound.communityRank1Id)
                        const rank2 = gameState.participants.find((p: any) => p.id === revealedRound.communityRank2Id)
                        const rank3 = gameState.participants.find((p: any) => p.id === revealedRound.communityRank3Id)
                        
                        return [rank1?.name, rank2?.name, rank3?.name].filter(Boolean).map((person, index) => (
                          <div key={person} className="flex items-center justify-center space-x-2">
                            <span className="text-2xl">{['🥇', '🥈', '🥉'][index]}</span>
                            <span className="font-medium">{person}</span>
                            {HOSTS.includes(person || '') && <span>👑</span>}
                          </div>
                        ))
                      }
                      
                      // Fallback - calculating...
                      return <div className="text-gray-500">Calculating community ranking...</div>
                    })()}
                  </div>
                </div>

                {/* Your Team's Score - Get from database */}
                {teamId && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Your Team's Answer:</h3>
                    <div className="space-y-1 mb-4">
                      {rankings.slice(0, 3).map((person, index) => (
                        <div key={person} className="flex items-center justify-center space-x-2">
                          <span className="text-lg">{index + 1}.</span>
                          <span className="font-medium">{person}</span>
                          {HOSTS.includes(person) && <span>👑</span>}
                        </div>
                      ))}
                    </div>
                    
                    {/* Show THIS round's score and total */}
                    <div className="space-y-3">
                      {(() => {
                        console.log('🎯 Player reveal - checking scores for team:', teamId)
                        console.log('Current round:', gameState.currentRound)
                        console.log('Rounds available:', gameState.rounds?.length)
                        
                        const currentRoundData = gameState.rounds?.[gameState.currentRound]
                        console.log('Current round data:', currentRoundData)
                        console.log('TeamScores in round:', currentRoundData?.teamScores)
                        
                        const thisRoundScore = currentRoundData?.teamScores?.find((ts: any) => ts.teamId === teamId)
                        console.log('This round score for team:', thisRoundScore)
                        
                        const currentTeam = gameState.teams?.find((t: any) => t.id === teamId)
                        console.log('Current team data:', currentTeam)
                        
                        return (
                          <>
                            {/* This Round's Score */}
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                              <div className="text-sm text-green-700 mb-1">This Round</div>
                              <div className="text-4xl font-bold text-green-700">
                                {thisRoundScore?.points !== undefined ? (
                                  `+${thisRoundScore.points}`
                                ) : (
                                  '...'
                                )} <span className="text-2xl">pts</span>
                              </div>
                            </div>
                            
                            {/* Total Accumulated Score */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
                              <div className="text-sm text-blue-700 mb-1">Total Score</div>
                              <div className="text-4xl font-bold text-blue-700">
                                {currentTeam?.totalScore !== undefined ? (
                                  currentTeam.totalScore
                                ) : (
                                  '...'
                                )} <span className="text-2xl">pts</span>
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
                                Accumulated across all rounds
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  Waiting for next round...
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