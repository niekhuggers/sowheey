'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function SimplePrefill() {
  const router = useRouter()
  const [currentPerson, setCurrentPerson] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [rankings, setRankings] = useState<string[]>([])
  const [fmkAnswers, setFmkAnswers] = useState<{[key: string]: string}>({}) // For FMK: person -> action
  const [allAnswers, setAllAnswers] = useState<any>({})

  const person = ALL_PEOPLE[currentPerson]
  const question = QUESTIONS[currentQuestion]
  const isLastPerson = currentPerson === ALL_PEOPLE.length - 1
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1
  const progress = ((currentPerson * QUESTIONS.length + currentQuestion + 1) / (ALL_PEOPLE.length * QUESTIONS.length)) * 100

  // Get available people to rank (exclude current person)
  const availablePeople = ALL_PEOPLE.filter(p => p !== person)

  const handlePersonSelect = (selectedPerson: string) => {
    if (rankings.includes(selectedPerson)) {
      setRankings(rankings.filter(p => p !== selectedPerson))
    } else if (rankings.length < 3) {
      setRankings([...rankings, selectedPerson])
    }
  }

  const saveCurrentAnswer = () => {
    if (isFMKQuestion) {
      // For FMK, check if all actions are assigned
      if (Object.keys(fmkAnswers).length !== 3) return
      
      const newAnswers = { ...allAnswers }
      if (!newAnswers[person]) newAnswers[person] = {}
      
      // Convert FMK answers to ranking format
      const fuckPerson = Object.keys(fmkAnswers).find(p => fmkAnswers[p] === 'Fuck')
      const marryPerson = Object.keys(fmkAnswers).find(p => fmkAnswers[p] === 'Marry')
      const killPerson = Object.keys(fmkAnswers).find(p => fmkAnswers[p] === 'Kill')
      
      newAnswers[person][currentQuestion] = [fuckPerson, marryPerson, killPerson]
      setAllAnswers(newAnswers)
      setFmkAnswers({})
    } else {
      // Regular question
      if (rankings.length !== 3) return

      const newAnswers = { ...allAnswers }
      if (!newAnswers[person]) newAnswers[person] = {}
      newAnswers[person][currentQuestion] = [...rankings]
      setAllAnswers(newAnswers)
      setRankings([])
    }

    // Move to next
    if (isLastQuestion) {
      if (isLastPerson) {
        // All done!
        // TODO: Save answers to database instead of localStorage
        router.push('/simple?step=play')
      } else {
        // Next person
        setCurrentPerson(currentPerson + 1)
        setCurrentQuestion(0)
      }
    } else {
      // Next question
      setCurrentQuestion(currentQuestion + 1)
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

  // Special handling for FMK question
  const isFMKQuestion = question.includes('Fuck, Marry, Kill')
  const fmkOptions = isFMKQuestion ? ['Aylin', 'Keone', 'Ceana'] : availablePeople

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{person}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">
              {person} - Vraag {currentQuestion + 1}/{QUESTIONS.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-xl font-medium text-center mb-6">
              {question}
            </h2>

            {isFMKQuestion ? (
              /* FMK Interface */
              <div className="space-y-6">
                <h3 className="font-medium text-center">Assign actions to each person:</h3>
                
                {['Aylin', 'Keone', 'Ceana'].map(person => (
                  <div key={person} className="border rounded-lg p-4">
                    <h4 className="font-medium text-center mb-3">{person}</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['Fuck', 'Marry', 'Kill'].map(action => (
                        <Button
                          key={action}
                          variant={fmkAnswers[person] === action ? 'primary' : 'secondary'}
                          onClick={() => handleFMKSelect(person, action)}
                          size="sm"
                          className={
                            action === 'Fuck' ? 'border-red-300 hover:bg-red-50' :
                            action === 'Marry' ? 'border-green-300 hover:bg-green-50' :
                            'border-gray-300 hover:bg-gray-50'
                          }
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Regular Rankings Interface */
              <>
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Top 3 (1e → 2e → 3e):</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map(pos => (
                      <div key={pos} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center min-h-16 flex items-center justify-center">
                        {rankings[pos] ? (
                          <span className="font-medium">{rankings[pos]}</span>
                        ) : (
                          <span className="text-gray-400">{pos + 1}e plek</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Selecteer mensen:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePeople.map(p => (
                      <Button
                        key={p}
                        variant={rankings.includes(p) ? 'primary' : 'secondary'}
                        onClick={() => handlePersonSelect(p)}
                        className="h-12"
                        disabled={!rankings.includes(p) && rankings.length >= 3}
                      >
                        {p} {HOSTS.includes(p) && '👑'}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="mt-6 text-center">
              <Button
                onClick={saveCurrentAnswer}
                disabled={isFMKQuestion ? Object.keys(fmkAnswers).length !== 3 : rankings.length !== 3}
                size="lg"
                className="w-full"
              >
                {isLastPerson && isLastQuestion ? 'Finish & Generate Teams' : 'Next →'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skip Button */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/simple')}
          >
            ← Back to Setup
          </Button>
        </div>
      </div>
    </div>
  )
}