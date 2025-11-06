'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MobileRanking } from '@/components/game/mobile-ranking'

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
const loadPrefilledAnswers = (): any => {
  try {
    const saved = localStorage.getItem('friendsWeekendAnswers')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error('Error loading prefilled answers:', error)
    return null
  }
}

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

  useEffect(() => {
    // Check if room code provided in URL
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setRoomCode(codeFromUrl)
      loadGameState(codeFromUrl)
    }

    // Check if team already selected
    const savedTeamId = localStorage.getItem('selectedTeamId')
    if (savedTeamId) {
      setTeamId(parseInt(savedTeamId))
    }
  }, [])

  const loadGameState = (code: string) => {
    const savedState = localStorage.getItem('weekendGameState')
    if (savedState) {
      const state = JSON.parse(savedState)
      if (state.roomCode === code) {
        setGameState(state)
        return
      }
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
    const prefilledAnswers = loadPrefilledAnswers()
    const communityRanking = calculateCommunityRanking(gameState.currentRound, prefilledAnswers)
    
    // Calculate team's score for this round
    const teamRanking = rankings
    const roundScore = calculateTeamScore(teamRanking, communityRanking)

    // Save submission locally (in real version would send to server)
    const submission = {
      teamId,
      round: gameState.currentRound,
      ranking: teamRanking,
      score: roundScore,
      communityRanking: communityRanking,
      timestamp: Date.now()
    }
    
    localStorage.setItem(`team-${teamId}-round-${gameState.currentRound}`, JSON.stringify(submission))
    
    // Update team's total score in game state
    const updatedGameState = { ...gameState }
    const teamIndex = updatedGameState.teams.findIndex((t: any) => t.id === teamId)
    if (teamIndex !== -1) {
      updatedGameState.teams[teamIndex].score = (updatedGameState.teams[teamIndex].score || 0) + roundScore
      localStorage.setItem('weekendGameState', JSON.stringify(updatedGameState))
    }
    
    setSubmitted(true)
  }

  // Poll for game state changes
  useEffect(() => {
    if (!gameState) return
    
    const interval = setInterval(() => {
      const savedState = localStorage.getItem('weekendGameState')
      if (savedState) {
        const state = JSON.parse(savedState)
        if (JSON.stringify(state) !== JSON.stringify(gameState)) {
          setGameState(state)
          // Reset submission state if new round
          if (state.currentRound !== gameState.currentRound) {
            setSubmitted(false)
            setRankings([])
            setFmkAnswers({})
          }
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState])

  // Join Room
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">🌟 Ranking the Stars</CardTitle>
            <p className="text-center text-gray-600">
              Join het weekend spel!
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
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">👥 Selecteer je Team</h1>
            <p className="text-gray-600">Room: {gameState.roomCode}</p>
          </div>

          <div className="space-y-4">
            {gameState.teams.map((team: any) => (
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
            ))}
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
                      const prefilledAnswers = loadPrefilledAnswers()
                      const communityRanking = calculateCommunityRanking(gameState.currentRound, prefilledAnswers)
                      
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

                {/* Show team's score for this round if available */}
                {(() => {
                  try {
                    const submission = localStorage.getItem(`team-${teamId}-round-${gameState.currentRound}`)
                    if (submission) {
                      const submissionData = JSON.parse(submission)
                      return (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-900">Your team's score this round:</div>
                          <div className="text-2xl font-bold text-blue-800">{submissionData.score || 0} points</div>
                        </div>
                      )
                    }
                  } catch (error) {
                    console.error('Error loading team submission:', error)
                  }
                  return null
                })()}
                
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