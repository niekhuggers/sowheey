'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BulkPrefill } from '@/components/host/bulk-prefill'
import { WeekendTeamManager } from '@/components/weekend/team-manager'

export default function WeekendRoomPage() {
  const { code } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [activeStep, setActiveStep] = useState<'prefill' | 'teams' | 'play'>('prefill')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRoom()
  }, [code])

  const loadRoom = async () => {
    try {
      const hostToken = localStorage.getItem('hostToken')
      if (!hostToken) {
        router.push('/weekend')
        return
      }

      const response = await fetch(`/api/rooms?code=${code}&hostToken=${hostToken}`)
      if (!response.ok) throw new Error('Room not found')
      
      const roomData = await response.json()
      setRoom(roomData)
      setParticipants(roomData.participants || [])
      setQuestions(roomData.questions || [])
      
      // Check if we already have pre-submissions
      if (roomData.participants?.length > 0) {
        const firstParticipant = roomData.participants[0]
        const subResponse = await fetch(
          `/api/pre-submissions?inviteToken=${firstParticipant.inviteToken}&roomCode=${code}`
        )
        
        if (subResponse.ok) {
          const submissions = await subResponse.json()
          if (submissions.length > 0) {
            setActiveStep('teams')
          }
        }
      }
    } catch (error) {
      console.error('Error loading room:', error)
      router.push('/weekend')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading weekend room...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">🎉 {room?.name}</h1>
          <p className="text-gray-600">Room Code: <span className="font-mono font-bold">{code}</span></p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${activeStep === 'prefill' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === 'prefill' ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                1
              </div>
              <span className="ml-2">Pre-fill Answers</span>
            </div>
            
            <div className="w-8 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${activeStep === 'teams' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === 'teams' ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2">Create Teams</span>
            </div>
            
            <div className="w-8 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${activeStep === 'play' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep === 'play' ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                3
              </div>
              <span className="ml-2">Team Links</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {activeStep === 'prefill' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stap 1: Vul alle antwoorden in</CardTitle>
                <p className="text-gray-600">
                  Vul voor elke persoon alle vragen in om later teams te kunnen maken
                </p>
              </CardHeader>
            </Card>
            
            <BulkPrefill
              room={room}
              participants={participants}
              questions={questions}
            />
            
            <div className="text-center">
              <Button
                onClick={() => setActiveStep('teams')}
                size="lg"
              >
                Next: Create Teams →
              </Button>
            </div>
          </div>
        )}

        {activeStep === 'teams' && (
          <WeekendTeamManager
            room={room}
            participants={participants}
            onComplete={() => setActiveStep('play')}
          />
        )}

        {activeStep === 'play' && (
          <Card>
            <CardHeader>
              <CardTitle>🎮 Ready to Play!</CardTitle>
              <p className="text-gray-600">
                Teams zijn aangemaakt. Nu kunnen jullie gaan spelen!
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Button
                  onClick={() => router.push(`/room/${code}/host`)}
                  size="lg"
                >
                  Open Game Dashboard →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}