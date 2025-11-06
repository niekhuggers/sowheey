'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// HARDCODED DATA
const PLAYERS = ['Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny']
const HOSTS = ['Niek', 'Joep', 'Merijn']
const ALL_PEOPLE = [...PLAYERS, ...HOSTS]

const QUESTIONS = [
  'Wie gaan nooit trouwen?',
  'Wie heeft de minste ambitie?', 
  'Wie zegt het vaakst last minute af?',
  'Wie zijn gedoemd om irritante kinderen te krijgen?',
  'Wie belanden later in de gevangenis?',
  'Wie denken dat ze slim zijn, maar zijn het niet?',
  'Wie zijn het irritantst als ze dronken zijn?',
  'Wie verlaat altijd als laatste het huis?',
  'Wie heeft het grootste ego zonder reden?',
  'Wie gebruikt het meeste drugs?',
  'Wie zou stand-up comedian kunnen zijn?',
  'Wie trouwt met een veel jongere partner?',
  'Wie zou je peetoom van je kind maken?',
  'Wie poept het meest?',
  'Fuck, Marry, Kill: Aylin, Keone en Ceana'
]

const COMMUNITY_ANSWERS = [
  ['Tim', 'Niek', 'Yanick'], // Wie gaan nooit trouwen
  ['Maurits', 'Sunny', 'Stijn'], // Wie heeft de minste ambitie
  ['Joep', 'Thijs', 'Rutger'], // Wie zegt het vaakst last minute af
  ['Tijn', 'Stijn', 'Joep'], // Wie zijn gedoemd om irritante kinderen te krijgen
  ['Stijn', 'Joep', 'Keith'], // Wie belanden later in de gevangenis
  ['Keith', 'Merijn', 'Tijn'], // Wie denken dat ze slim zijn, maar zijn het niet
  ['Keith', 'Niek', 'Rutger'], // Wie zijn het irritantst als ze dronken zijn
  ['Thijs', 'Stijn', 'Yanick'], // Wie verlaat altijd als laatste het huis
  ['Tijn', 'Niek', 'Casper'], // Wie heeft het grootste ego zonder reden
  ['Merijn', 'Sunny', 'Stijn'], // Wie gebruikt het meeste drugs
  ['Rutger', 'Casper', 'Sunny'], // Wie zou stand-up comedian kunnen zijn
  ['Niek', 'Tijn', 'Tim'], // Wie trouwt met een veel jongere partner
  ['Niek', 'Yanick', 'Thijs'], // Wie zou je peetoom van je kind maken
  ['Tijn', 'Stijn', 'Thijs'], // Wie poept het meest
  ['Aylin', 'Keone', 'Ceana'] // FMK - special handling
]

interface GameState {
  isSetup: boolean
  currentRound: number
  roundStatus: 'waiting' | 'active' | 'revealing' | 'completed'
  teams: Array<{
    id: number
    name: string
    members: string[]
    score: number
  }>
  roomCode: string
  answersPrefilled: boolean
  roomId?: string
  participants?: Array<{
    id: string
    name: string
    inviteToken: string
    isHost: boolean
    isGuest: boolean
  }>
  questions?: Array<{
    id: string
    text: string
    category: string
    sortOrder: number
  }>
}

export default function AdminDashboard() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    isSetup: false,
    currentRound: 0,
    roundStatus: 'waiting',
    teams: [],
    roomCode: '',
    answersPrefilled: false
  })
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPrefill, setShowPrefill] = useState(false)
  const [showTeamCreation, setShowTeamCreation] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamMembers, setNewTeamMembers] = useState<string[]>([])
  const [currentPrefillPerson, setCurrentPrefillPerson] = useState(0)
  const [currentPrefillQuestion, setCurrentPrefillQuestion] = useState(0)
  const [prefillAnswers, setPrefillAnswers] = useState<any>({})
  const [justSaved, setJustSaved] = useState(false)

  // Calculate completion stats
  const getCompletionStats = () => {
    const totalAnswersNeeded = ALL_PEOPLE.length * QUESTIONS.length
    let completedAnswers = 0
    
    ALL_PEOPLE.forEach(person => {
      QUESTIONS.forEach((_, qIndex) => {
        if (prefillAnswers[person]?.[qIndex]?.length === 3) {
          completedAnswers++
        }
      })
    })
    
    return {
      completed: completedAnswers,
      total: totalAnswersNeeded,
      percentage: Math.round((completedAnswers / totalAnswersNeeded) * 100)
    }
  }

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem('adminAuthenticated')
    if (auth === 'true') {
      setIsAuthenticated(true)
      loadGameState()
    }
  }, [])

  const authenticate = () => {
    // Simple password check - in production use proper auth
    if (adminPassword === 'weekend2024') {
      setIsAuthenticated(true)
      localStorage.setItem('adminAuthenticated', 'true')
      loadGameState()
    } else {
      alert('Verkeerd wachtwoord!')
    }
  }

  const loadGameState = () => {
    // Load existing game state from localStorage
    const savedState = localStorage.getItem('weekendGameState')
    if (savedState) {
      setGameState(JSON.parse(savedState))
    }
  }

  const saveGameState = (newState: GameState) => {
    setGameState(newState)
    localStorage.setItem('weekendGameState', JSON.stringify(newState))
  }

  const setupGame = async () => {
    setLoading(true)
    
    try {
      // Use fixed room code for consistent weekend games
      const roomCode = 'WEEKEND2024'

      // Create room and participants in database
      const setupResponse = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Friends Weekend Game',
          code: roomCode,
          participants: ALL_PEOPLE.map(name => ({
            name,
            isHost: HOSTS.includes(name),
            isGuest: false
          })),
          questions: QUESTIONS.map((text, index) => ({
            text,
            category: text.includes('Fuck, Marry, Kill') ? 'special' : 'general',
            sortOrder: index
          }))
        })
      })

      if (!setupResponse.ok) {
        throw new Error('Failed to create room')
      }

      const roomData = await setupResponse.json()
      
      // Create standard team division from your screenshot
      const standardTeams = [
        { id: 1, name: 'Group 1', members: ['Keith', 'Casper'], score: 0 },
        { id: 2, name: 'Group 2', members: ['Tim', 'Stijn'], score: 0 },
        { id: 3, name: 'Group 3', members: ['Maurits', 'Tijn'], score: 0 },
        { id: 4, name: 'Group 4', members: ['Thijs', 'Yanick'], score: 0 },
        { id: 5, name: 'Group 5', members: ['Sunny', 'Rutger'], score: 0 }
      ]

      const newState: GameState = {
        isSetup: true,
        currentRound: 0,
        roundStatus: 'waiting',
        teams: standardTeams,
        roomCode,
        answersPrefilled: false,
        roomId: roomData.room.id,
        participants: roomData.participants,
        questions: roomData.questions
      }

      saveGameState(newState)
    } catch (error) {
      console.error('Error setting up game:', error)
      alert('Failed to setup game. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addTeam = () => {
    if (!newTeamName.trim() || newTeamMembers.length !== 2) {
      alert('Team naam en 2 leden zijn verplicht!')
      return
    }

    const newTeam = {
      id: Math.max(0, ...gameState.teams.map(t => t.id)) + 1,
      name: newTeamName.trim(),
      members: [...newTeamMembers],
      score: 0
    }

    const newState = {
      ...gameState,
      teams: [...gameState.teams, newTeam]
    }

    saveGameState(newState)
    setNewTeamName('')
    setNewTeamMembers([])
  }

  const removeTeam = (teamId: number) => {
    const newState = {
      ...gameState,
      teams: gameState.teams.filter(t => t.id !== teamId)
    }
    saveGameState(newState)
  }

  const toggleMember = (person: string) => {
    if (newTeamMembers.includes(person)) {
      setNewTeamMembers(newTeamMembers.filter(m => m !== person))
    } else if (newTeamMembers.length < 2) {
      setNewTeamMembers([...newTeamMembers, person])
    }
  }

  const startPrefill = () => {
    // Load existing answers if any
    const saved = localStorage.getItem('friendsWeekendAnswers')
    if (saved) {
      setPrefillAnswers(JSON.parse(saved))
    } else {
      // Initialize empty answers
      const initialAnswers: any = {}
      ALL_PEOPLE.forEach(person => {
        initialAnswers[person] = {}
        QUESTIONS.forEach((_, qIndex) => {
          initialAnswers[person][qIndex] = []
        })
      })
      setPrefillAnswers(initialAnswers)
    }
    
    setCurrentPrefillPerson(0)
    setCurrentPrefillQuestion(0)
    setShowPrefill(true)
  }

  const savePrefillAnswer = async (rankings: string[]) => {
    const personName = ALL_PEOPLE[currentPrefillPerson]
    
    // Update local state first
    const newAnswers = {
      ...prefillAnswers,
      [personName]: {
        ...prefillAnswers[personName],
        [currentPrefillQuestion]: rankings
      }
    }
    setPrefillAnswers(newAnswers)
    
    // Save to database if we have room data
    if (gameState.roomId && gameState.participants && gameState.questions) {
      try {
        const participant = gameState.participants.find(p => p.name === personName)
        const question = gameState.questions[currentPrefillQuestion]
        
        if (participant && question && rankings.length === 3) {
          // Convert ranking names to participant IDs
          const rank1Participant = gameState.participants.find(p => p.name === rankings[0])
          const rank2Participant = gameState.participants.find(p => p.name === rankings[1])
          const rank3Participant = gameState.participants.find(p => p.name === rankings[2])
          
          if (rank1Participant && rank2Participant && rank3Participant) {
            const response = await fetch('/api/pre-submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inviteToken: participant.inviteToken,
                roomCode: gameState.roomCode,
                submissions: [{
                  questionId: question.id,
                  rank1ParticipantId: rank1Participant.id,
                  rank2ParticipantId: rank2Participant.id,
                  rank3ParticipantId: rank3Participant.id,
                }]
              })
            })
            
            if (!response.ok) {
              console.error('Failed to save pre-submission to database')
            }
          }
        }
      } catch (error) {
        console.error('Error saving to database:', error)
      }
    }
    
    // Also save to localStorage as backup
    localStorage.setItem('friendsWeekendAnswers', JSON.stringify(newAnswers))

    // Move to next
    if (currentPrefillQuestion < QUESTIONS.length - 1) {
      setCurrentPrefillQuestion(currentPrefillQuestion + 1)
    } else if (currentPrefillPerson < ALL_PEOPLE.length - 1) {
      setCurrentPrefillPerson(currentPrefillPerson + 1)
      setCurrentPrefillQuestion(0)
    } else {
      // All done!
      const newState = { ...gameState, answersPrefilled: true }
      saveGameState(newState)
      setShowPrefill(false)
      alert('Alle antwoorden zijn ingevuld!')
    }
  }

  const startRound = () => {
    const newState = {
      ...gameState,
      roundStatus: 'active' as const
    }
    saveGameState(newState)
  }

  const revealResults = () => {
    const newState = {
      ...gameState,
      roundStatus: 'revealing' as const
    }
    saveGameState(newState)
    
    // Auto advance after 10 seconds
    setTimeout(() => {
      const nextState = {
        ...newState,
        roundStatus: gameState.currentRound >= QUESTIONS.length - 1 ? 'completed' as const : 'waiting' as const,
        currentRound: gameState.currentRound + 1
      }
      saveGameState(nextState)
    }, 10000)
  }

  const resetGame = () => {
    if (confirm('Weet je zeker dat je het spel wilt resetten?')) {
      const newState: GameState = {
        isSetup: false,
        currentRound: 0,
        roundStatus: 'waiting',
        teams: [],
        roomCode: '',
        answersPrefilled: false
      }
      saveGameState(newState)
      localStorage.removeItem('friendsWeekendAnswers')
      localStorage.removeItem('friendsWeekendTeams')
      setPrefillAnswers({})
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('adminAuthenticated')
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">🔐 Admin Login</CardTitle>
            <p className="text-center text-gray-600">
              Ranking the Stars - Admin Dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Admin Wachtwoord
              </label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Voer admin wachtwoord in"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    authenticate()
                  }
                }}
              />
            </div>
            
            <Button
              onClick={authenticate}
              className="w-full"
              size="lg"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">🎮 Admin Dashboard</h1>
            <p className="text-gray-600">Ranking the Stars - Weekend Control</p>
          </div>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>

        {!gameState.isSetup ? (
          /* Game Setup */
          <Card>
            <CardHeader>
              <CardTitle>🚀 Game Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Weekend Configuration:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><strong>Players:</strong> {PLAYERS.join(', ')}</div>
                  <div><strong>Hosts:</strong> {HOSTS.join(', ')}</div>
                  <div><strong>Questions:</strong> {QUESTIONS.length} vragen</div>
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  onClick={setupGame}
                  disabled={loading}
                  size="lg"
                  className="w-full max-w-md"
                >
                  {loading ? 'Setting up...' : 'Initialize Weekend Game'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Game Control */
          <div className="space-y-6">
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-800">{gameState.roomCode}</div>
                    <div className="text-sm text-green-600">Room Code</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-800">{gameState.currentRound + 1}/{QUESTIONS.length}</div>
                    <div className="text-sm text-blue-600">Current Round</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800">{gameState.teams.length}</div>
                    <div className="text-sm text-purple-600">Teams</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Round Control */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Round Control</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-xl font-medium text-center p-4 bg-gray-50 rounded-lg">
                    {QUESTIONS[gameState.currentRound]}
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    {gameState.roundStatus === 'waiting' && (
                      <Button onClick={startRound} size="lg" className="bg-green-600 hover:bg-green-700">
                        ▶️ Start Round {gameState.currentRound + 1}
                      </Button>
                    )}
                    
                    {gameState.roundStatus === 'active' && (
                      <Button onClick={revealResults} size="lg" className="bg-blue-600 hover:bg-blue-700">
                        🎉 Reveal Results
                      </Button>
                    )}
                    
                    {gameState.roundStatus === 'revealing' && (
                      <div className="text-center">
                        <div className="text-lg font-medium mb-4">Showing Results...</div>
                        <div className="space-y-2">
                          {COMMUNITY_ANSWERS[gameState.currentRound].map((person, index) => (
                            <div key={person} className="flex items-center justify-center space-x-2">
                              <span className="text-2xl">{['🥇', '🥈', '🥉'][index]}</span>
                              <span className="font-medium">{person}</span>
                              {HOSTS.includes(person) && <span>👑</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {gameState.roundStatus === 'completed' && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-4">🎉 Game Completed!</div>
                      <p className="text-gray-600">All questions have been answered.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Pre-fill Answers Modal */}
            {showPrefill && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>📝 Pre-fill Answers</CardTitle>
                  
                  {/* Player Navigation */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Person:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ALL_PEOPLE.map((person, index) => (
                          <Button
                            key={person}
                            variant={currentPrefillPerson === index ? 'primary' : 'secondary'}
                            onClick={() => setCurrentPrefillPerson(index)}
                            size="sm"
                            className={HOSTS.includes(person) ? 'border-yellow-300' : ''}
                          >
                            {person} {HOSTS.includes(person) && '👑'}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Question Navigation */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Question {currentPrefillQuestion + 1} / {QUESTIONS.length}:</label>
                      <div className="grid grid-cols-5 gap-1 mb-3">
                        {QUESTIONS.map((_, qIndex) => (
                          <Button
                            key={qIndex}
                            variant={currentPrefillQuestion === qIndex ? 'primary' : 'secondary'}
                            onClick={() => setCurrentPrefillQuestion(qIndex)}
                            size="sm"
                            className="h-8 text-xs"
                          >
                            {qIndex + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-lg font-medium text-center p-4 bg-blue-50 rounded-lg">
                      {QUESTIONS[currentPrefillQuestion]}
                    </div>
                    
                    {QUESTIONS[currentPrefillQuestion].includes('Fuck, Marry, Kill') ? (
                      <div className="space-y-4">
                        <h3 className="font-medium text-center">Assign actions for {ALL_PEOPLE[currentPrefillPerson]}:</h3>
                        {['Aylin', 'Keone', 'Ceana'].map(person => (
                          <div key={person} className="border rounded-lg p-3">
                            <h4 className="font-medium text-center mb-2">{person}</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {['Fuck', 'Marry', 'Kill'].map(action => (
                                <Button
                                  key={action}
                                  variant={prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion]?.includes(person) && 
                                    prefillAnswers[ALL_PEOPLE[currentPrefillPerson]][currentPrefillQuestion].indexOf(person) === ['Fuck', 'Marry', 'Kill'].indexOf(action) 
                                    ? 'primary' : 'secondary'}
                                  onClick={() => {
                                    const newAnswers = { ...prefillAnswers }
                                    const person = ALL_PEOPLE[currentPrefillPerson]
                                    const ranking = []
                                    if (action === 'Fuck') ranking[0] = person
                                    else if (action === 'Marry') ranking[1] = person  
                                    else ranking[2] = person
                                    
                                    if (!newAnswers[person]) newAnswers[person] = {}
                                    if (!newAnswers[person][currentPrefillQuestion]) newAnswers[person][currentPrefillQuestion] = []
                                    newAnswers[person][currentPrefillQuestion] = ranking
                                    setPrefillAnswers(newAnswers)
                                  }}
                                  size="sm"
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="font-medium text-center">Select top 3 ranking for {ALL_PEOPLE[currentPrefillPerson]}:</h3>
                        
                        {/* Show current ranking */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium mb-2">Current Ranking:</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2].map(pos => {
                              const currentAnswers = prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion] || []
                              const person = currentAnswers[pos]
                              return (
                                <div key={pos} className="text-center p-2 border rounded">
                                  <div className="font-medium text-xs text-gray-600">{pos + 1}. plaats</div>
                                  <div className="font-medium">
                                    {person ? (
                                      <span>{person} {HOSTS.includes(person) && '👑'}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_PEOPLE.map(person => {
                            const currentAnswers = prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion] || []
                            const position = currentAnswers.indexOf(person)
                            const isSelected = position !== -1
                            
                            return (
                              <Button
                                key={person}
                                variant={isSelected ? 'primary' : 'secondary'}
                                onClick={() => {
                                  let newAnswers = [...currentAnswers]
                                  
                                  if (isSelected) {
                                    // Remove from current position
                                    newAnswers = newAnswers.filter(p => p !== person)
                                  } else if (newAnswers.length < 3) {
                                    // Add to next available position
                                    newAnswers.push(person)
                                  }
                                  
                                  const updatedPrefillAnswers = {
                                    ...prefillAnswers,
                                    [ALL_PEOPLE[currentPrefillPerson]]: {
                                      ...prefillAnswers[ALL_PEOPLE[currentPrefillPerson]],
                                      [currentPrefillQuestion]: newAnswers
                                    }
                                  }
                                  setPrefillAnswers(updatedPrefillAnswers)
                                }}
                                size="sm"
                                disabled={!isSelected && currentAnswers.length >= 3}
                                className={isSelected ? `relative` : ''}
                              >
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {position + 1}
                                  </span>
                                )}
                                {person} {HOSTS.includes(person) && '👑'}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <div className="text-center text-sm text-gray-600">
                          Selected: {prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion]?.length || 0} / 3
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-4">
                      <Button
                        variant="secondary"
                        onClick={() => setShowPrefill(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={async () => {
                          const currentAnswers = prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion] || []
                          if (currentAnswers.length === 3) {
                            await savePrefillAnswer(currentAnswers)
                            
                            // Show save feedback
                            setJustSaved(true)
                            setTimeout(() => setJustSaved(false), 2000)
                          }
                        }}
                        disabled={(prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion]?.length || 0) !== 3}
                        className={`flex-1 ${justSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        {justSaved ? '✅ Saved!' : 'Save Answer'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Creation Modal */}
            {showTeamCreation && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>👥 Create Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Team Name</label>
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Select 2 Members</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PLAYERS.map(player => (
                          <Button
                            key={player}
                            variant={newTeamMembers.includes(player) ? 'primary' : 'secondary'}
                            onClick={() => toggleMember(player)}
                            disabled={!newTeamMembers.includes(player) && newTeamMembers.length >= 2}
                            size="sm"
                          >
                            {player}
                          </Button>
                        ))}
                      </div>
                      <div className="text-center text-sm text-gray-600 mt-2">
                        Selected: {newTeamMembers.length} / 2
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowTeamCreation(false)
                          setNewTeamName('')
                          setNewTeamMembers([])
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addTeam}
                        disabled={!newTeamName.trim() || newTeamMembers.length !== 2}
                        className="flex-1"
                      >
                        Create Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teams Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>👥 Teams</span>
                  <Button
                    onClick={() => setShowTeamCreation(true)}
                    size="sm"
                  >
                    + Add Team
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gameState.teams.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">👥</div>
                      <p>No teams created yet</p>
                      <p className="text-sm">Click "Add Team" to create teams manually</p>
                    </div>
                  ) : (
                    gameState.teams.map((team: any) => (
                      <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-gray-600">
                            {team.members.join(' + ')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Score</div>
                            <div className="font-medium">{team.score || 0}</div>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeTeam(team.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pre-fill Progress */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Pre-fill Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const stats = getCompletionStats()
                  const progressPercentage = stats.percentage
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Completion Status</span>
                        <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      
                      <div className="text-center text-gray-600">
                        <span className="font-medium">{stats.completed}</span> / <span className="font-medium">{stats.total}</span> answers completed
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-medium text-blue-800">{ALL_PEOPLE.length}</div>
                          <div className="text-blue-600">People</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="font-medium text-purple-800">{QUESTIONS.length}</div>
                          <div className="text-purple-600">Questions</div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle>⚙️ Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={startPrefill}
                    variant="secondary"
                    disabled={showPrefill}
                  >
                    📝 Pre-fill All Answers
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/play?code=${gameState.roomCode}`)}
                  >
                    👀 Preview Player View
                  </Button>
                  
                  <Button
                    variant="danger"
                    onClick={resetGame}
                    className="col-span-2"
                  >
                    🔄 Reset Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}