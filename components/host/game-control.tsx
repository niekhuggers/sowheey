'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant, Question, Round } from '@/lib/types'

interface GameControlProps {
  room: any
  participants: Participant[]
  onAction: (action: string, payload: any) => void
}

export function GameControl({ room, participants, onAction }: GameControlProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGameState()
  }, [room.id])

  const loadGameState = async () => {
    try {
      const response = await fetch(`/api/rooms?code=${room.code}&hostToken=${localStorage.getItem('hostToken')}`)
      const data = await response.json()
      
      setQuestions(data.questions || [])
      setCurrentRound(data.rounds?.[0] || null)
    } catch (error) {
      console.error('Failed to load game state:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewRound = () => {
    if (!selectedQuestion) return
    
    const roundNumber = currentRound ? currentRound.roundNumber + 1 : 1
    onAction('start-round', { questionId: selectedQuestion, roundNumber })
  }

  const closeRound = () => {
    if (!currentRound) return
    onAction('close-round', { roundId: currentRound.id })
  }

  const revealRound = async () => {
    if (!currentRound) return
    
    try {
      const response = await fetch(`/api/rounds/${currentRound.id}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: localStorage.getItem('hostToken') }),
      })
      
      const data = await response.json()
      
      onAction('reveal-round', {
        roundId: currentRound.id,
        communityRank1Id: data.communityRank1Id,
        communityRank2Id: data.communityRank2Id,
        communityRank3Id: data.communityRank3Id,
      })
    } catch (error) {
      console.error('Failed to calculate round results:', error)
    }
  }

  if (loading) {
    return <div>Loading game state...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!currentRound || currentRound.status === 'REVEALED' ? (
              <div className="space-y-4">
                <h3 className="font-medium">Start New Round</h3>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                >
                  <option value="">Select a question</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.text}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={startNewRound}
                  disabled={!selectedQuestion || participants.length < 3}
                  className="w-full"
                >
                  Start Round {currentRound ? currentRound.roundNumber + 1 : 1}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">Current Round {currentRound.roundNumber}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {questions.find((q) => q.id === currentRound.questionId)?.text}
                  </p>
                  <p className="text-sm">
                    Status: <span className="font-medium">{currentRound.status}</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  {currentRound.status === 'OPEN' && (
                    <Button onClick={closeRound} className="flex-1">
                      Close Submissions
                    </Button>
                  )}
                  
                  {currentRound.status === 'CLOSED' && (
                    <Button onClick={revealRound} className="flex-1">
                      Reveal Results
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={room.preEventLocked}
                onChange={(e) => onAction('lock-pre-event', { locked: e.target.checked })}
              />
              <span>Lock Pre-Event Submissions</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={room.rosterLocked}
                onChange={(e) => onAction('lock-roster', { locked: e.target.checked })}
              />
              <span>Lock Roster</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={room.teamsLocked}
                onChange={(e) => onAction('lock-teams', { locked: e.target.checked })}
              />
              <span>Lock Teams</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}