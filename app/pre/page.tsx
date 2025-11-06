'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Question, Participant, PreSubmission } from '@/lib/types'

function PreEventPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [submissions, setSubmissions] = useState<Record<string, string[]>>({})
  const [savedSubmissions, setSavedSubmissions] = useState<PreSubmission[]>([])

  const roomCode = searchParams.get('room')
  const inviteToken = searchParams.get('token')

  useEffect(() => {
    if (!roomCode || !inviteToken) {
      router.push('/')
      return
    }

    loadData()
  }, [roomCode, inviteToken])

  const loadData = async () => {
    try {
      // Load participant info
      const participantRes = await fetch(`/api/participants?roomCode=${roomCode}&inviteToken=${inviteToken}`)
      if (!participantRes.ok) throw new Error('Invalid invite link')
      const participantData = await participantRes.json()
      setParticipant(participantData[0])

      // Load all participants
      const allParticipantsRes = await fetch(`/api/participants?roomCode=${roomCode}`)
      const allParticipants = await allParticipantsRes.json()
      setParticipants(allParticipants.filter((p: Participant) => p.id !== participantData[0].id))

      // Load questions
      const roomRes = await fetch(`/api/rooms?code=${roomCode}`)
      const roomData = await roomRes.json()
      setQuestions(roomData.questions || [])

      // Load existing submissions
      const submissionsRes = await fetch(`/api/pre-submissions?inviteToken=${inviteToken}&roomCode=${roomCode}`)
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json()
        setSavedSubmissions(submissionsData)
        
        // Convert to working format
        const converted: Record<string, string[]> = {}
        submissionsData.forEach((sub: PreSubmission) => {
          converted[sub.questionId] = [
            sub.rank1ParticipantId,
            sub.rank2ParticipantId,
            sub.rank3ParticipantId,
          ]
        })
        setSubmissions(converted)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, participantId: string) => {
    e.dataTransfer.setData('participantId', participantId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, questionId: string, position: number) => {
    e.preventDefault()
    const participantId = e.dataTransfer.getData('participantId')
    
    const current = submissions[questionId] || []
    const newRanking = [...current]
    
    // Remove participant if already ranked
    const existingIndex = newRanking.indexOf(participantId)
    if (existingIndex !== -1) {
      newRanking.splice(existingIndex, 1)
    }
    
    // Add to new position
    newRanking[position] = participantId
    
    setSubmissions({
      ...submissions,
      [questionId]: newRanking,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const submissionData = Object.entries(submissions)
        .filter(([_, ranks]) => ranks.length === 3 && ranks.every(Boolean))
        .map(([questionId, ranks]) => ({
          questionId,
          rank1ParticipantId: ranks[0],
          rank2ParticipantId: ranks[1],
          rank3ParticipantId: ranks[2],
        }))

      const response = await fetch('/api/pre-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteToken,
          roomCode,
          submissions: submissionData,
        }),
      })

      if (!response.ok) throw new Error('Failed to save submissions')
      
      alert('Submissions saved successfully!')
    } catch (err) {
      setError('Failed to save submissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Pre-Event Rankings</h1>
          <p className="text-gray-600">
            Hi {participant?.name}! Rank the top 3 for each question by dragging participants.
          </p>
        </div>

        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-medium mb-2">Available Participants</h3>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-full cursor-move shadow-sm hover:shadow-md transition-shadow"
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                    {p.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question) => {
            const ranking = submissions[question.id] || []
            const isComplete = ranking.length === 3 && ranking.every(Boolean)
            
            return (
              <Card key={question.id} className={isComplete ? 'border-green-500' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">{question.text}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {[0, 1, 2].map((position) => {
                      const participantId = ranking[position]
                      const participant = participants.find((p) => p.id === participantId)
                      
                      return (
                        <div
                          key={position}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[80px] flex flex-col items-center justify-center"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, question.id, position)}
                        >
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            {position === 0 ? '1st' : position === 1 ? '2nd' : '3rd'}
                          </div>
                          {participant ? (
                            <div className="flex flex-col items-center gap-1">
                              {participant.avatarUrl ? (
                                <img
                                  src={participant.avatarUrl}
                                  alt={participant.name}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                                  {participant.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm text-center">{participant.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Drop here</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Completed: {Object.values(submissions).filter((r) => r.length === 3 && r.every(Boolean)).length} / {questions.length}
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PreEventPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <PreEventPageContent />
    </Suspense>
  )
}