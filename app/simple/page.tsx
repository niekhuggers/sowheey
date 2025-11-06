'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// HARDCODED FRIENDS DATA
const PLAYERS = [
  'Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny'
]

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
  ['Aylin', 'Keone', 'Ceana'] // FMK - will be handled specially
]

export default function SimpleFriendsWeekend() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<'setup' | 'prefill' | 'play'>('setup')
  const [gameData, setGameData] = useState<any>(null)

  useEffect(() => {
    // Check URL params for step
    const urlParams = new URLSearchParams(window.location.search)
    const step = urlParams.get('step')
    if (step === 'play') {
      setCurrentStep('play')
      // TODO: Load game data from database instead of localStorage
      const teams = generateRandomTeams()
      setGameData({ answers: {}, teams })
    }
  }, [])

  const setupGame = () => {
    // Initialize game data with empty answers
    const initialData = {
      friends: PLAYERS,
      hosts: HOSTS,
      questions: QUESTIONS,
      answers: {} as any, // person -> question -> [rank1, rank2, rank3]
      teams: [] as any[],
      currentRound: 0,
      gameStarted: false
    }

    // Initialize empty answers for each person and question
    ALL_PEOPLE.forEach(person => {
      initialData.answers[person] = {}
      QUESTIONS.forEach((question, qIndex) => {
        initialData.answers[person][qIndex] = []
      })
    })

    setGameData(initialData)
    setCurrentStep('prefill')
  }

  const generateRandomTeams = () => {
    const shuffledPlayers = [...PLAYERS].sort(() => Math.random() - 0.5)
    const teams = []
    
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (i + 1 < shuffledPlayers.length) {
        teams.push({
          id: i / 2 + 1,
          name: `Team ${i / 2 + 1}`,
          members: [shuffledPlayers[i], shuffledPlayers[i + 1]]
        })
      }
    }
    return teams
  }

  const generateTeams = () => {
    const teams = generateRandomTeams()
    // TODO: Save teams to database instead of localStorage
    setGameData({...gameData, teams})
    setCurrentStep('play')
  }

  if (currentStep === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-3xl text-center">🌟 Ranking the Stars</CardTitle>
            <p className="text-center text-gray-600">
              Vrienden Weekend Edition
            </p>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Game Setup:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Players:</strong> {PLAYERS.join(', ')}</div>
                <div><strong>Hosts:</strong> {HOSTS.join(', ')}</div>
                <div><strong>Questions:</strong> {QUESTIONS.length} vragen</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-gray-600">
                Klaar om te beginnen? We gaan eerst alle antwoorden invoeren, daarna teams maken en dan spelen!
              </p>
              
              <Button
                onClick={setupGame}
                size="lg"
                className="w-full"
              >
                Start Game Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === 'prefill') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">📝 Antwoorden Invoeren</h1>
            <p className="text-gray-600">Vul voor iedereen alle antwoorden in</p>
          </div>

          <div className="mb-6">
            <Button
              onClick={() => router.push('/simple/prefill')}
              size="lg"
              className="w-full"
            >
              Start Bulk Prefill →
            </Button>
          </div>

          <div className="text-center">
            <Button
              onClick={generateTeams}
              variant="secondary"
              size="lg"
            >
              Skip to Team Generation →
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 'play') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">🎮 Let's Play!</h1>
            <p className="text-gray-600">Teams zijn gemaakt, tijd om te spelen</p>
          </div>

          <div className="grid gap-4 mb-6">
            {gameData?.teams?.map((team: any) => (
              <Card key={team.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-gray-600">
                        {team.members.join(' + ')}
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push(`/simple/play/${team.id}`)}
                    >
                      Play →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={() => router.push('/simple/host')}
              variant="secondary"
              size="lg"
            >
              Host Dashboard →
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}