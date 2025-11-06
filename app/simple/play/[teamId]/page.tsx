'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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

export default function TeamPlay() {
  const { teamId } = useParams()
  const [team, setTeam] = useState<any>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'revealing'>('waiting')
  const [rankings, setRankings] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  
  useEffect(() => {
    // Load team data
    const savedTeams = localStorage.getItem('friendsWeekendTeams')
    if (savedTeams) {
      const teams = JSON.parse(savedTeams)
      const currentTeam = teams.find((t: any) => t.id === parseInt(teamId as string))
      setTeam(currentTeam)
    }

    // Poll for game status changes (in real version this would be Socket.IO)
    const interval = setInterval(() => {
      // For demo purposes, just cycle through states automatically
      const now = Date.now()
      const minute = Math.floor(now / 10000) % 3 // Change every 10 seconds
      
      if (minute === 0) setGameStatus('waiting')
      else if (minute === 1) setGameStatus('active')
      else setGameStatus('revealing')
      
      setCurrentRound(Math.floor(now / 30000) % QUESTIONS.length) // Change round every 30 seconds
    }, 1000)

    return () => clearInterval(interval)
  }, [teamId])

  const handlePersonSelect = (person: string) => {
    if (rankings.includes(person)) {
      setRankings(rankings.filter(p => p !== person))
    } else if (rankings.length < 3) {
      setRankings([...rankings, person])
    }
  }

  const submitRanking = () => {
    if (rankings.length !== 3) return
    
    // Save submission (in real version this would go to server)
    const submission = {
      teamId: team.id,
      round: currentRound,
      ranking: [...rankings],
      timestamp: Date.now()
    }
    
    localStorage.setItem(`team-${team.id}-round-${currentRound}`, JSON.stringify(submission))
    setSubmitted(true)
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team not found</h1>
          <Button onClick={() => window.location.href = '/simple'}>
            Back to Setup
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = QUESTIONS[currentRound]
  const isFMKQuestion = currentQuestion.includes('Fuck, Marry, Kill')
  const availablePeople = ALL_PEOPLE.filter(p => !team.members.includes(p))

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Team Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-gray-600">{team.members.join(' + ')}</p>
        </div>

        {gameStatus === 'waiting' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-xl font-medium mb-2">Waiting for host to start round...</h2>
              <p className="text-gray-600">Round {currentRound + 1} / {QUESTIONS.length}</p>
            </CardContent>
          </Card>
        )}

        {gameStatus === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Round {currentRound + 1} / {QUESTIONS.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!submitted ? (
                <div className="space-y-6">
                  {/* Question */}
                  <div className="text-xl font-medium text-center p-4 bg-blue-50 rounded-lg">
                    {currentQuestion}
                  </div>

                  {/* Rankings Display */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-center">
                      {isFMKQuestion ? 'Volgorde (Fuck → Marry → Kill):' : 'Jouw team top 3:'}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(pos => (
                        <div key={pos} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center min-h-16 flex items-center justify-center">
                          {rankings[pos] ? (
                            <span className="font-medium">{rankings[pos]}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              {isFMKQuestion ? ['Fuck', 'Marry', 'Kill'][pos] : `${pos + 1}e`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* People Selection */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Selecteer mensen:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(isFMKQuestion ? ['Aylin', 'Keone', 'Ceana'] : availablePeople).map(person => (
                        <Button
                          key={person}
                          variant={rankings.includes(person) ? 'primary' : 'secondary'}
                          onClick={() => handlePersonSelect(person)}
                          className="h-12 text-sm"
                          disabled={!rankings.includes(person) && rankings.length >= 3}
                        >
                          {person} {HOSTS.includes(person) && '👑'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
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
                  <p className="text-gray-600">Waiting for other teams and results...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {gameStatus === 'revealing' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Round {currentRound + 1} Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-lg font-medium">{currentQuestion}</div>
                
                <div className="text-4xl">🎉</div>
                
                <div>
                  <h3 className="font-medium mb-2">Community Top 3:</h3>
                  <div className="space-y-1">
                    <div>🥇 Demo Winner</div>
                    <div>🥈 Demo Runner-up</div>
                    <div>🥉 Demo Third</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Waiting for next round...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => window.location.href = '/simple'}>
            ← Back to Game Setup
          </Button>
        </div>
      </div>
    </div>
  )
}