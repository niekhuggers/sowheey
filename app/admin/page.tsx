'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { connectSocket, sendHostAction, getSocket } from '@/lib/socket-client'

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
  const [showTeamCreation, setShowTeamCreation] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamMembers, setNewTeamMembers] = useState<string[]>([])
  const [currentPrefillPerson, setCurrentPrefillPerson] = useState(0)
  const [currentPrefillQuestion, setCurrentPrefillQuestion] = useState(0)
  const [prefillAnswers, setPrefillAnswers] = useState<any>({})
  const [dataLoaded, setDataLoaded] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [testMode, setTestMode] = useState(false)

  // Calculate completion stats
  const getCompletionStats = () => {
    const totalAnswersNeeded = ALL_PEOPLE.length * QUESTIONS.length
    let completedAnswers = 0
    
    ALL_PEOPLE.forEach(person => {
      QUESTIONS.forEach((questionText, qIndex) => {
        const answers = prefillAnswers[person]?.[qIndex] || []
        
        // Check if this is a F/M/K question
        if (questionText.includes('Fuck, Marry, Kill')) {
          // F/M/K: all 3 positions must be filled with non-empty strings
          if (answers.length === 3 && 
              answers[0] && answers[0].trim() !== '' &&
              answers[1] && answers[1].trim() !== '' && 
              answers[2] && answers[2].trim() !== '') {
            completedAnswers++
          }
        } else {
          // Regular questions: need exactly 3 non-empty answers
          if (answers.length === 3 && 
              answers.every((answer: string) => answer && answer.trim() !== '')) {
            completedAnswers++
          }
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
    // Auto-load game state without localStorage authentication check
    if (!dataLoaded) {
      loadGameState()
    }
    
    // Connect to Socket.IO
    connectSocket()
    
    return () => {
      // Clean up socket connection on unmount
      const socket = getSocket()
      socket.disconnect()
    }
  }, [])

  const authenticate = () => {
    // Simple password check - in production use proper auth
    if (adminPassword === 'weekend2024') {
      setIsAuthenticated(true)
      loadGameState()
    } else {
      alert('Verkeerd wachtwoord!')
    }
  }

  const loadPrefilledAnswersFromDatabase = async (roomData: any) => {
    try {
      // Fetch all pre-submissions for this room
      console.log('Fetching pre-submissions for roomId:', roomData.id)
      const response = await fetch(`/api/pre-submissions?roomId=${roomData.id}`)
      console.log('Pre-submissions response status:', response.status)
      
      if (response.ok) {
        const preSubmissions = await response.json()
        console.log('Pre-submissions received:', preSubmissions.length, 'items')
        console.log('Sample pre-submission:', preSubmissions[0])
        
        // Transform database pre-submissions back to the expected format
        const dbAnswers: any = {}
        
        // Initialize empty structure for all people
        ALL_PEOPLE.forEach(person => {
          dbAnswers[person] = {}
          QUESTIONS.forEach((_, qIndex) => {
            dbAnswers[person][qIndex] = []
          })
        })
        
        // Fill in actual pre-submission data
        preSubmissions.forEach((submission: any) => {
          const participantName = submission.participant.name
          const questionIndex = roomData.questions.findIndex((q: any) => q.id === submission.questionId)
          
          console.log(`Processing submission: ${participantName} for question ${questionIndex}`)
          
          if (participantName && questionIndex >= 0) {
            dbAnswers[participantName][questionIndex] = [
              submission.rank1Participant.name,
              submission.rank2Participant.name,
              submission.rank3Participant.name
            ]
          }
        })
        
        setPrefillAnswers(dbAnswers)
        setDataLoaded(true)
        console.log('Final transformed answers:', dbAnswers)
        console.log('Sample person answers:', dbAnswers['Maurits'])
        console.log('Current prefillAnswers state after setPrefillAnswers:', dbAnswers)
        
        // Test the exact same lookup the UI will use
        const testPerson = ALL_PEOPLE[0] // First person 
        const testQuestion = 0 // First question
        console.log(`UI Test: prefillAnswers[${testPerson}][${testQuestion}] =`, dbAnswers[testPerson]?.[testQuestion])
      } else {
        console.log('No pre-submissions found, using empty answers')
        // Initialize empty answers if no data in database
        const initialAnswers: any = {}
        ALL_PEOPLE.forEach(person => {
          initialAnswers[person] = {}
          QUESTIONS.forEach((_, qIndex) => {
            initialAnswers[person][qIndex] = []
          })
        })
        setPrefillAnswers(initialAnswers)
        setDataLoaded(true)
      }
    } catch (error) {
      console.error('Error loading prefilled answers from database:', error)
      // Fallback to empty answers
      const initialAnswers: any = {}
      ALL_PEOPLE.forEach(person => {
        initialAnswers[person] = {}
        QUESTIONS.forEach((_, qIndex) => {
          initialAnswers[person][qIndex] = []
        })
      })
      setPrefillAnswers(initialAnswers)
      setDataLoaded(true)
    }
  }

  const loadGameState = async () => {
    try {
      // Always try to load WEEKEND2024 room from database first  
      const response = await fetch(`/api/rooms?code=WEEKEND2024&hostToken=weekend2024-admin-token`)
      if (response.ok) {
        const roomData = await response.json()
        
        // Transform database teams to match expected format
        const teams = roomData.teams?.map((team: any) => ({
          id: team.id,
          name: team.name,
          members: team.members.map((member: any) => member.participant.name),
          score: team.aggregateScores?.[0]?.totalScore || 0
        })) || []
        
        // Set game state as already setup with weekend room
        const newState: GameState = {
          isSetup: true,
          currentRound: 0,
          roundStatus: 'waiting',
          teams: teams,
          roomCode: 'WEEKEND2024',
          answersPrefilled: true, // Data is now in database
          roomId: roomData.id,
          participants: roomData.participants,
          questions: roomData.questions
        }
        setGameState(newState)
        
        // Load prefilled answers from database instead of localStorage
        await loadPrefilledAnswersFromDatabase(roomData)
      } else {
        // Room doesn't exist yet, create it
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
            questions: QUESTIONS.map((text, index) => ({
              text,
              category: text.includes('Fuck, Marry, Kill') ? 'special' : 'general',
              sortOrder: index
            }))
          })
        })
        
        if (createResponse.ok) {
          const data = await createResponse.json()
          const newState: GameState = {
            isSetup: true,
            currentRound: 0,
            roundStatus: 'waiting',
            teams: [],
            roomCode: 'WEEKEND2024',
            answersPrefilled: false,
            roomId: data.room.id,
            participants: data.participants,
            questions: data.questions
          }
          setGameState(newState)
        } else {
          console.log('Room not found')
        }
      }
    } catch (error) {
      console.error('Error loading room:', error)
    }
    
    // Data is loaded from database via loadPrefilledAnswersFromDatabase()
    // No need for localStorage fallback since we migrated to database
  }

  const saveGameState = (newState: GameState) => {
    setGameState(newState)
  }


  const setupTestGame = async () => {
    setLoading(true)
    try {
      const testParticipants = [
        { name: 'Test Player 1', isHost: false, isGuest: false },
        { name: 'Test Player 2', isHost: false, isGuest: false },
        { name: 'Test Player 3', isHost: false, isGuest: false },
        { name: 'Test Host', isHost: true, isGuest: false }
      ]

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Room',
          participants: testParticipants,
          questions: QUESTIONS.slice(0, 3).map((q, index) => ({
            text: q,
            category: q.includes('Fuck, Marry, Kill') ? 'special' : 'general',
            sortOrder: index,
          }))
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Test room creation error:', error)
        throw new Error(error.error || error.message || 'Failed to create test room')
      }

      const data = await response.json()
      console.log('Test room created:', data)
      alert(`Test room created! Code: ${data.room.code}`)
    } catch (error) {
      console.error('Error setting up test game:', error)
      alert('Failed to setup test game: ' + (error as Error).message)
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
    
    // Save to database using admin endpoint
    if (gameState.roomCode && gameState.participants && gameState.questions) {
      try {
        const question = gameState.questions[currentPrefillQuestion]
        
        if (question && rankings.length === 3) {
          // Check if this is the FMK question (last question)
          const isFMKQuestion = currentPrefillQuestion === QUESTIONS.length - 1
          
          if (isFMKQuestion) {
            // For FMK question, save the literal names (Aylin, Keone, Ceana) as special entries
            console.log('Saving FMK answers to database:', personName, 'Q' + currentPrefillQuestion, rankings)
            // For now, skip saving FMK to database since it needs special handling
            console.log('FMK answers need special database handling - skipping for now')
          } else {
            // Convert ranking names to participant IDs for regular questions
            const rank1Participant = gameState.participants.find(p => p.name === rankings[0])
            const rank2Participant = gameState.participants.find(p => p.name === rankings[1])
            const rank3Participant = gameState.participants.find(p => p.name === rankings[2])
            
            if (rank1Participant && rank2Participant && rank3Participant) {
              console.log('Saving to database:', personName, 'Q' + currentPrefillQuestion, rankings)
              const response = await fetch('/api/admin/pre-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomCode: gameState.roomCode,
                  hostToken: 'weekend2024-admin-token',
                  participantName: personName,
                  questionId: question.id,
                  rank1ParticipantId: rank1Participant.id,
                  rank2ParticipantId: rank2Participant.id,
                  rank3ParticipantId: rank3Participant.id,
                })
              })
              
              if (response.ok) {
                console.log('✅ Successfully saved to database')
              } else {
                console.error('❌ Failed to save to database:', response.status, await response.text())
              }
            } else {
              console.error('❌ Could not find all participants for ranking:', rankings)
            }
          }
        }
      } catch (error) {
        console.error('Error saving to database:', error)
      }
    }

    // Move to next question/person automatically
    if (currentPrefillQuestion < QUESTIONS.length - 1) {
      setCurrentPrefillQuestion(currentPrefillQuestion + 1)
    } else if (currentPrefillPerson < ALL_PEOPLE.length - 1) {
      setCurrentPrefillPerson(currentPrefillPerson + 1)
      setCurrentPrefillQuestion(0)
    } else {
      // Loop back to first person/question instead of closing
      setCurrentPrefillPerson(0)
      setCurrentPrefillQuestion(0)
      alert('Reached the end! You can continue editing or close manually.')
    }
  }

  const startRound = () => {
    if (!gameState.questions || !gameState.questions[gameState.currentRound]) {
      console.error('No question available for current round')
      return
    }
    
    // Send Socket.IO host action to start round
    sendHostAction(gameState.roomCode, 'weekend2024-admin-token', 'start-round', {
      questionId: gameState.questions[gameState.currentRound].id,
      roundNumber: gameState.currentRound + 1
    })
    
    // Also update local state for immediate UI feedback
    const newState = {
      ...gameState,
      roundStatus: 'active' as const
    }
    setGameState(newState)
  }

  const revealResults = () => {
    // Send Socket.IO host action to reveal results
    sendHostAction(gameState.roomCode, 'weekend2024-admin-token', 'reveal-results', {})
    
    // Also update local state for immediate UI feedback
    const newState = {
      ...gameState,
      roundStatus: 'revealing' as const
    }
    setGameState(newState)
    
    // Auto advance after 10 seconds
    setTimeout(() => {
      const nextState = {
        ...newState,
        roundStatus: gameState.currentRound >= QUESTIONS.length - 1 ? 'completed' as const : 'waiting' as const,
        currentRound: gameState.currentRound + 1
      }
      setGameState(nextState)
      
      // Send Socket.IO action for next round or completion
      if (gameState.currentRound >= QUESTIONS.length - 1) {
        sendHostAction(gameState.roomCode, 'weekend2024-admin-token', 'complete-game', {})
      } else {
        sendHostAction(gameState.roomCode, 'weekend2024-admin-token', 'next-round', {})
      }
    }, 10000)
  }

  const resetRoundsOnly = () => {
    if (confirm('Reset rounds only? (Keeps community rankings and teams)')) {
      const newState = {
        ...gameState,
        currentRound: 0,
        roundStatus: 'waiting' as const
      }
      saveGameState(newState)
    }
  }

  const migrateLocalData = async () => {
    // Use hardcoded host token for WEEKEND2024
    const hostToken = 'weekend2024-admin-token'
    
    // Skip complex room loading - just proceed with migration using hardcoded room code
    // The migration API will handle room validation

    // Database-first approach - no localStorage migration needed anymore
    const localData = {
      friendsWeekendAnswers: null,
      teams: []
    }

    setLoading(true)
    try {
      const response = await fetch('/api/migrate-local-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: 'WEEKEND2024',
          hostToken,
          localData
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ Migration successful!\n${result.message}`)
      } else {
        alert(`❌ Migration failed: ${result.error}\nDetails: ${result.details || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`❌ Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const debugMigration = async () => {
    // Database-first approach - debug from database state
    let teams: any[] = []

    const localData = {
      friendsWeekendAnswers: null,
      teams: teams
    }

    console.log('=== DEBUG MIGRATION DATA ===')
    console.log('Database-first approach - no localStorage data')
    console.log('Current gameState:', gameState)
    console.log('Parsed teams:', teams)
    console.log('Final localData:', localData)

    try {
      const response = await fetch('/api/debug-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localData })
      })

      const result = await response.json()
      console.log('Debug result:', result)
      alert(`Debug completed! Check console for details.\n\nSummary:\n- Local answers: ${localData.friendsWeekendAnswers ? Object.keys(localData.friendsWeekendAnswers).length : 0} people\n- Local teams: ${teams.length}\n- Database participants: ${result.debug?.participantCount || 0}\n- Database questions: ${result.debug?.questionCount || 0}`)
    } catch (error) {
      console.error('Debug error:', error)
      alert('Debug failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const resetGame = () => {
    if (confirm('⚠️ FULL RESET: This will delete ALL LOCAL data including community rankings! Are you sure?')) {
      // Reset local state but keep WEEKEND2024 room in database
      const newState: GameState = {
        isSetup: true,  // Keep as setup since WEEKEND2024 always exists
        currentRound: 0,
        roundStatus: 'waiting',
        teams: [],
        roomCode: 'WEEKEND2024',
        answersPrefilled: false,
        roomId: gameState.roomId,
        participants: gameState.participants,
        questions: gameState.questions
      }
      saveGameState(newState)
      setPrefillAnswers({})
      
      // Re-initialize empty answers
      const initialAnswers: any = {}
      ALL_PEOPLE.forEach(person => {
        initialAnswers[person] = {}
        QUESTIONS.forEach((_, qIndex) => {
          initialAnswers[person][qIndex] = []
        })
      })
      setPrefillAnswers(initialAnswers)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Test Mode:</label>
              <button
                onClick={() => setTestMode(!testMode)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  testMode ? 'bg-orange-500' : 'bg-gray-300'
                } relative`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                    testMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Always show game control - WEEKEND2024 is permanent */}
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
                <p className="text-gray-600">
                  <strong>Scoring:</strong> Teams get +1 point for each person they guess correctly in community top 3, 
                  +2 bonus points for exact position matches (max 9 points per round)
                </p>
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


            {/* Pre-fill Answers - Always Visible */}
            <Card className="mb-6">
                <CardHeader>
                  <CardTitle>📊 Community Rankings Setup</CardTitle>
                <p className="text-gray-600">Enter how each person ranks others. Teams will try to guess these community averages during the game!</p>
                  
                  {/* Player Navigation */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Person:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ALL_PEOPLE.map((person, index) => {
                          // Check if all questions are filled for this person
                          const isPersonComplete = QUESTIONS.every((_, qIndex) => {
                            const answers = prefillAnswers[person]?.[qIndex] || []
                            return answers.length === 3 && answers.every((a: string) => a && a.trim() !== '')
                          })
                          
                          return (
                            <Button
                              key={person}
                              variant={currentPrefillPerson === index ? 'primary' : 'secondary'}
                              onClick={() => setCurrentPrefillPerson(index)}
                              size="sm"
                              className={`
                                ${HOSTS.includes(person) ? 'border-yellow-300' : ''}
                                ${isPersonComplete ? 'bg-green-100 hover:bg-green-200 border-green-500' : ''}
                              `}
                            >
                              {person} {HOSTS.includes(person) && '👑'} {isPersonComplete && '✓'}
                            </Button>
                          )
                        })}
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
                        
                        {/* Show current F/M/K assignments */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium mb-2">Current Assignments:</div>
                          <div className="grid grid-cols-3 gap-2">
                            {['Fuck', 'Marry', 'Kill'].map((action, index) => {
                              const currentPlayerName = ALL_PEOPLE[currentPrefillPerson]
                              const currentRanking = prefillAnswers[currentPlayerName]?.[currentPrefillQuestion] || ['', '', '']
                              const assignedPerson = currentRanking[index]
                              return (
                                <div key={action} className="text-center p-2 border rounded">
                                  <div className={`font-medium text-xs ${
                                    action === 'Fuck' ? 'text-red-600' :
                                    action === 'Marry' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{action}</div>
                                  <div className="font-medium">
                                    {assignedPerson ? (
                                      <span>{assignedPerson}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {['Aylin', 'Keone', 'Ceana'].map(target => (
                          <div key={target} className="border rounded-lg p-3">
                            <h4 className="font-medium text-center mb-2">{target}</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {['Fuck', 'Marry', 'Kill'].map(action => {
                                const currentPlayerName = ALL_PEOPLE[currentPrefillPerson]
                                const currentRanking = prefillAnswers[currentPlayerName]?.[currentPrefillQuestion] || ['', '', '']
                                const actionIndex = ['Fuck', 'Marry', 'Kill'].indexOf(action)
                                const isSelected = currentRanking[actionIndex] === target
                                
                                return (
                                  <Button
                                    key={action}
                                    variant={isSelected ? 'primary' : 'secondary'}
                                    onClick={() => {
                                      const newAnswers = { ...prefillAnswers }
                                      
                                      if (!newAnswers[currentPlayerName]) {
                                        newAnswers[currentPlayerName] = {}
                                      }
                                      if (!newAnswers[currentPlayerName][currentPrefillQuestion]) {
                                        newAnswers[currentPlayerName][currentPrefillQuestion] = ['', '', '']
                                      }
                                      
                                      const newRanking = [...newAnswers[currentPlayerName][currentPrefillQuestion]]
                                      
                                      // Remove this target from any other position
                                      for (let i = 0; i < newRanking.length; i++) {
                                        if (newRanking[i] === target) {
                                          newRanking[i] = ''
                                        }
                                      }
                                      
                                      // Set this target for this action
                                      newRanking[actionIndex] = target
                                      
                                      newAnswers[currentPlayerName][currentPrefillQuestion] = newRanking
                                      setPrefillAnswers(newAnswers)
                                    }}
                                    size="sm"
                                    className={
                                      action === 'Fuck' ? 'border-red-300 hover:bg-red-50' :
                                      action === 'Marry' ? 'border-green-300 hover:bg-green-50' :
                                      'border-gray-700 hover:bg-gray-100'
                                    }
                                  >
                                    {action}
                                  </Button>
                                )
                              })}
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
                              console.log(`UI Debug: Person=${ALL_PEOPLE[currentPrefillPerson]}, Question=${currentPrefillQuestion}, Answers=`, currentAnswers)
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
                        onClick={async () => {
                          const currentAnswers = prefillAnswers[ALL_PEOPLE[currentPrefillPerson]]?.[currentPrefillQuestion] || []
                          if (currentAnswers.length === 3) {
                            await savePrefillAnswer(currentAnswers)
                            
                            // Show save feedback
                            setJustSaved(true)
                            setTimeout(() => setJustSaved(false), 2000)
                          }
                        }}
                        disabled={(() => {
                          const currentPlayerName = ALL_PEOPLE[currentPrefillPerson]
                          const currentAnswers = prefillAnswers[currentPlayerName]?.[currentPrefillQuestion] || []
                          const questionText = QUESTIONS[currentPrefillQuestion]
                          
                          if (questionText.includes('Fuck, Marry, Kill')) {
                            // F/M/K: all 3 positions must be filled
                            return !(currentAnswers.length === 3 && 
                                     currentAnswers[0] && currentAnswers[0].trim() !== '' &&
                                     currentAnswers[1] && currentAnswers[1].trim() !== '' && 
                                     currentAnswers[2] && currentAnswers[2].trim() !== '')
                          } else {
                            // Regular: exactly 3 non-empty answers
                            return !(currentAnswers.length === 3 && 
                                     currentAnswers.every((answer: string) => answer && answer.trim() !== ''))
                          }
                        })()}
                        className={`w-full ${justSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        {justSaved ? '✅ Saved!' : 'Save Answer'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

            {/* Community Rankings Progress */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Community Rankings Progress</CardTitle>
                <p className="text-gray-600">Each person needs to rank all others for each question</p>
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

            {/* Community Rankings */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Community Rankings</CardTitle>
                <p className="text-gray-600">This is the core of the game - teams will try to guess these community rankings</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/play?code=${gameState.roomCode}`)}
                  >
                    👀 Preview Player View
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={resetRoundsOnly}
                    className="border-blue-300 hover:bg-blue-50"
                  >
                    🔄 Reset Rounds Only
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={debugMigration}
                    className="border-yellow-300 hover:bg-yellow-50 text-yellow-700"
                  >
                    🔍 Debug Migration Data
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={migrateLocalData}
                    disabled={loading}
                    className="border-green-300 hover:bg-green-50 text-green-700"
                  >
                    {loading ? 'Migrating...' : '📥 Migrate Local Data to Database'}
                  </Button>
                  
                  <Button
                    variant="danger"
                    onClick={resetGame}
                  >
                    ⚠️ Full Reset (Deletes All Data)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Mode Section */}
            {testMode && (
              <Card>
                <CardHeader>
                  <CardTitle>🧪 Test Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 mb-2">Test Room Creation:</h4>
                    <p className="text-sm text-orange-800">
                      Create temporary test rooms for testing game mechanics without affecting the main weekend room.
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setupTestGame()}
                      disabled={loading}
                      size="lg"
                      variant="secondary"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      {loading ? 'Setting up...' : '🧪 Create Test Room'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
      </div>
    </div>
  )
}