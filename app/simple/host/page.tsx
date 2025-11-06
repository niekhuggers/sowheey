'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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

// Community answers for scoring
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
  currentRound: number
  roundStatus: 'waiting' | 'active' | 'revealing' | 'completed'
  teams: Array<{
    id: number
    name: string
    members: string[]
    currentAnswer?: string[]
    submitted?: boolean
    score?: number
  }>
  scores: { [teamId: number]: number }
}

export default function SimpleHost() {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 0,
    roundStatus: 'waiting',
    teams: [],
    scores: {}
  })

  const [allAnswers, setAllAnswers] = useState<any>({})

  useEffect(() => {
    // TODO: Load answers from database instead of localStorage
    setAllAnswers({})

    // TODO: Load teams from database instead of localStorage
    // Generate random teams from players only (not hosts)
    const shuffledPlayers = [...PLAYERS].sort(() => Math.random() - 0.5)
    const teams: any[] = []
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (i + 1 < shuffledPlayers.length) {
        teams.push({
          id: i / 2 + 1,
          name: `Team ${i / 2 + 1}`,
          members: [shuffledPlayers[i], shuffledPlayers[i + 1]],
          submitted: false,
          score: 0
        })
      }
    }
    
    setGameState(prev => ({ ...prev, teams }))
  }, [])

  const startRound = () => {
    setGameState(prev => ({
      ...prev,
      roundStatus: 'active',
      teams: prev.teams.map(team => ({ ...team, submitted: false, currentAnswer: undefined }))
    }))
  }

  const revealResults = () => {
    setGameState(prev => ({ ...prev, roundStatus: 'revealing' }))
    
    // Show results for a few seconds then move to next round
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        roundStatus: prev.currentRound >= QUESTIONS.length - 1 ? 'completed' : 'waiting',
        currentRound: prev.currentRound + 1
      }))
    }, 5000)
  }

  const currentQuestion = QUESTIONS[gameState.currentRound]
  const communityRanking = gameState.roundStatus === 'revealing' ? 
    COMMUNITY_ANSWERS[gameState.currentRound] : []

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🎮 Host Dashboard</h1>
          <p className="text-gray-600">Control the game flow</p>
        </div>

        {/* Current Round */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Round {gameState.currentRound + 1} / {QUESTIONS.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-xl font-medium text-center p-4 bg-blue-50 rounded-lg">
                {currentQuestion}
              </div>
              
              <div className="flex justify-center space-x-4">
                {gameState.roundStatus === 'waiting' && (
                  <Button onClick={startRound} size="lg">
                    Start Round
                  </Button>
                )}
                
                {gameState.roundStatus === 'active' && (
                  <Button onClick={revealResults} size="lg">
                    Reveal Results
                  </Button>
                )}
                
                {gameState.roundStatus === 'revealing' && (
                  <div className="text-center">
                    <div className="text-lg font-medium mb-4">Community Top 3:</div>
                    <div className="space-y-2">
                      {communityRanking.map((person, index) => (
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
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Teams Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {gameState.teams.map(team => (
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
                    {gameState.roundStatus === 'active' && (
                      <div className={`px-2 py-1 rounded text-sm ${
                        team.submitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {team.submitted ? 'Submitted' : 'Waiting...'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Controls */}
        <div className="text-center space-x-4">
          <Button variant="secondary" onClick={() => window.location.href = '/simple'}>
            ← Back to Setup
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => {
              // TODO: Reset game data in database instead of localStorage
              window.location.reload()
            }}
          >
            Reset Game
          </Button>
        </div>
      </div>
    </div>
  )
}