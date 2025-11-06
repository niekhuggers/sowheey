'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant, Question } from '@/lib/types'
import { MobileRanking } from '@/components/game/mobile-ranking'

interface BulkPrefillProps {
  room: any
  participants: Participant[]
  questions: Question[]
}

export function BulkPrefill({ room, participants, questions }: BulkPrefillProps) {
  const [currentParticipant, setCurrentParticipant] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<string, string[]>>>({})
  const [saving, setSaving] = useState(false)

  const participant = participants[currentParticipant]
  const question = questions[currentQuestion]

  const getAnswerKey = (participantId: string, questionId: string) => 
    `${participantId}-${questionId}`

  const getCurrentRankings = () => {
    if (!participant || !question) return []
    const key = getAnswerKey(participant.id, question.id)
    return allAnswers[participant.id]?.[question.id] || []
  }

  const handleRankingChange = (rankings: string[]) => {
    if (!participant || !question) return
    
    setAllAnswers(prev => ({
      ...prev,
      [participant.id]: {
        ...prev[participant.id],
        [question.id]: rankings
      }
    }))
  }

  const nextStep = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else if (currentParticipant < participants.length - 1) {
      setCurrentParticipant(currentParticipant + 1)
      setCurrentQuestion(0)
    }
  }

  const prevStep = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    } else if (currentParticipant > 0) {
      setCurrentParticipant(currentParticipant - 1)
      setCurrentQuestion(questions.length - 1)
    }
  }

  const saveAllAnswers = async () => {
    setSaving(true)
    
    try {
      for (const participantId of Object.keys(allAnswers)) {
        const participantAnswers = allAnswers[participantId]
        
        const submissions = Object.entries(participantAnswers)
          .filter(([_, rankings]) => rankings.length === 3 && rankings.every(Boolean))
          .map(([questionId, rankings]) => ({
            questionId,
            rank1ParticipantId: rankings[0],
            rank2ParticipantId: rankings[1],
            rank3ParticipantId: rankings[2],
          }))

        if (submissions.length > 0) {
          const participant = participants.find(p => p.id === participantId)
          if (participant) {
            const response = await fetch('/api/pre-submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inviteToken: participant.inviteToken,
                roomCode: room.code,
                submissions,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to save answers for ${participant.name}`)
            }
          }
        }
      }
      
      alert('All answers saved successfully!')
    } catch (error) {
      console.error('Error saving answers:', error)
      alert('Failed to save some answers. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const getProgress = () => {
    const totalSteps = participants.length * questions.length
    const currentStep = currentParticipant * questions.length + currentQuestion + 1
    return { current: currentStep, total: totalSteps }
  }

  const progress = getProgress()
  const isComplete = currentParticipant === participants.length - 1 && 
                    currentQuestion === questions.length - 1
  const canProceed = getCurrentRankings().length === 3 && getCurrentRankings().every(Boolean)

  if (!participant || !question) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Bulk Pre-fill Answers
          </CardTitle>
          <div className="text-center text-sm text-gray-600">
            {participant.name} - Question {currentQuestion + 1} of {questions.length}
          </div>
          <div className="text-center text-xs text-gray-500">
            Progress: {progress.current} / {progress.total}
          </div>
        </CardHeader>
        <CardContent>
          <MobileRanking
            participants={participants.filter(p => p.id !== participant.id)}
            rankings={getCurrentRankings()}
            onRankingChange={handleRankingChange}
            question={{
              text: question.text,
              type: question.category === 'special' ? 'fmk' : 'normal',
              fixedOptions: question.text.includes('Aylin, Keone en Ceana') 
                ? ['Aylin', 'Keone', 'Ceana'] 
                : undefined
            }}
          />
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentParticipant === 0 && currentQuestion === 0}
              className="flex-1"
            >
              Previous
            </Button>
            
            {!isComplete ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={saveAllAnswers}
                disabled={saving || !canProceed}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save All Answers'}
              </Button>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={saveAllAnswers}
              disabled={saving}
              size="sm"
            >
              Save Progress Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}