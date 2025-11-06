'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Default participants voor het weekend
const DEFAULT_PARTICIPANTS = [
  'Aylin', 'Keone', 'Ceana', 'Sarah', 'Tom', 'Lisa', 'Mike'
]

const DEFAULT_HOSTS = [
  'Niek', 'Joep'
]

interface RoomTemplate {
  id: string
  name: string
  participants: Array<{name: string, isHost: boolean}>
  createdAt: string
}

export default function WeekendSetup() {
  const router = useRouter()
  const [roomName, setRoomName] = useState('Vrienden Weekend')
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS)
  const [hosts, setHosts] = useState(DEFAULT_HOSTS)
  const [newParticipant, setNewParticipant] = useState('')
  const [newHost, setNewHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<RoomTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const addParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim()) && !hosts.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()])
      setNewParticipant('')
    }
  }

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter(p => p !== name))
  }

  const addHost = () => {
    if (newHost.trim() && !hosts.includes(newHost.trim()) && !participants.includes(newHost.trim())) {
      setHosts([...hosts, newHost.trim()])
      setNewHost('')
    }
  }

  const removeHost = (name: string) => {
    setHosts(hosts.filter(h => h !== name))
  }

  const loadTemplates = async () => {
    const hostToken = localStorage.getItem('hostToken')
    if (!hostToken) return
    
    try {
      const response = await fetch(`/api/room-templates?hostToken=${hostToken}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      setError('Template naam is verplicht')
      return
    }
    
    const hostToken = localStorage.getItem('hostToken')
    if (!hostToken) {
      setError('Geen host token gevonden')
      return
    }
    
    try {
      const allParticipants = [
        ...participants.map(name => ({ name, isHost: false })),
        ...hosts.map(name => ({ name, isHost: true }))
      ]
      
      const response = await fetch('/api/room-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          hostToken,
          participants: allParticipants,
          isWeekendMode: true,
        }),
      })
      
      if (response.ok) {
        setTemplateName('')
        loadTemplates()
        alert('Template opgeslagen!')
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      setError('Failed to save template')
    }
  }

  const loadFromTemplate = (template: RoomTemplate) => {
    const templateParticipants = template.participants.filter(p => !(p as any).isHost)
    const templateHosts = template.participants.filter(p => (p as any).isHost)
    
    setParticipants(templateParticipants.map(p => p.name))
    setHosts(templateHosts.map(p => p.name))
    setRoomName(template.name)
    setShowTemplates(false)
  }

  const createWeekendRoom = async () => {
    setLoading(true)
    setError('')
    
    if (participants.length < 2) {
      setError('Je hebt minimaal 2 spelers nodig voor teams')
      setLoading(false)
      return
    }
    
    try {
      console.log('Creating room with name:', roomName)
      
      // 1. Create room
      const roomResponse = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      })
      
      console.log('Room response status:', roomResponse.status)
      
      if (!roomResponse.ok) {
        const errorData = await roomResponse.json()
        console.error('Room creation error:', errorData)
        throw new Error(errorData.error || 'Failed to create room')
      }
      const room = await roomResponse.json()
      
      console.log('Room created successfully:', room)
      
      // Store tokens
      localStorage.setItem('hostToken', room.hostToken)
      localStorage.setItem('roomCode', room.code)
      
      // 2. Add all participants and hosts
      const allPeople = [...participants, ...hosts]
      console.log('Adding participants:', participants)
      console.log('Adding hosts:', hosts)
      let successCount = 0
      
      for (const name of allPeople) {
        try {
          console.log(`Adding person: ${name}`)
          const participantResponse = await fetch('/api/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: room.id,
              name: name,
              avatarUrl: '',
              hostToken: room.hostToken,
              isHost: hosts.includes(name), // Mark hosts differently
            }),
          })
          
          if (participantResponse.ok) {
            successCount++
            console.log(`Successfully added ${name}`)
          } else {
            const error = await participantResponse.json()
            console.warn(`Failed to add ${name}:`, error)
          }
        } catch (err) {
          console.warn(`Error adding ${name}:`, err)
        }
      }
      
      console.log(`Added ${successCount} out of ${allPeople.length} people`)
      
      if (successCount === 0) {
        throw new Error('Failed to add any participants')
      }
      
      // 3. Navigate to weekend room
      router.push(`/weekend/${room.code}`)
      
    } catch (error) {
      console.error('Error creating weekend room:', error)
      setError(error instanceof Error ? error.message : 'Failed to create weekend room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">🎉 Weekend Mode</CardTitle>
          <p className="text-center text-gray-600">
            Versimpelde versie voor het vrienden weekend
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Management */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Room Templates</h4>
              <Button
                variant="secondary"
                
                onClick={() => {
                  setShowTemplates(!showTemplates)
                  if (!showTemplates) loadTemplates()
                }}
              >
                {showTemplates ? 'Verberg' : 'Bekijk Templates'}
              </Button>
            </div>
            
            {showTemplates && (
              <div className="space-y-3">
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Opgeslagen configuraties:</p>
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between bg-white rounded p-2 border">
                        <div>
                          <span className="font-medium">{template.name}</span>
                          <div className="text-xs text-gray-500">
                            {template.participants.filter(p => !(p as any).isHost).length} spelers, {template.participants.filter(p => (p as any).isHost).length} hosts
                          </div>
                        </div>
                        <Button
                          
                          onClick={() => loadFromTemplate(template)}
                        >
                          Laad
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 mb-2">Huidige setup opslaan:</p>
                  <div className="flex gap-2">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template naam"
                      
                    />
                    <Button
                      size="sm"
                      onClick={saveAsTemplate}
                      variant="secondary"
                    >
                      Opslaan
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Room Naam
            </label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Vrienden Weekend"
            />
          </div>
          
          <div className="space-y-4">
            {/* Players who will be in teams */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Spelers (komen in teams)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    placeholder="Nieuwe speler toevoegen"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addParticipant()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addParticipant}
                    variant="secondary"
                  >
                    Toevoegen
                  </Button>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {participants.map((name, index) => (
                      <div key={index} className="flex items-center justify-between bg-white rounded px-2 py-1 border">
                        <span className="text-sm">{name}</span>
                        <button
                          type="button"
                          onClick={() => removeParticipant(name)}
                          className="text-red-500 hover:text-red-700 text-xs ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {participants.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">Nog geen spelers toegevoegd</p>
                  )}
                </div>
              </div>
            </div>

            {/* Game hosts who can be ranked but won't be in teams */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Game Hosts (kunnen geranked worden, maar niet in teams)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newHost}
                    onChange={(e) => setNewHost(e.target.value)}
                    placeholder="Nieuwe host toevoegen"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHost()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addHost}
                    variant="secondary"
                  >
                    Toevoegen
                  </Button>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {hosts.map((name, index) => (
                      <div key={index} className="flex items-center justify-between bg-white rounded px-2 py-1 border border-blue-200">
                        <span className="text-sm font-medium text-blue-800">{name} 👑</span>
                        <button
                          type="button"
                          onClick={() => removeHost(name)}
                          className="text-red-500 hover:text-red-700 text-xs ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {hosts.length === 0 && (
                    <p className="text-gray-500 text-sm text-center">Nog geen hosts toegevoegd</p>
                  )}
                </div>
              </div>
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>
          
          <Button
            onClick={createWeekendRoom}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Setting up...' : 'Start Weekend Game'}
          </Button>
          
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              size="sm"
            >
              ← Back to Regular Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}