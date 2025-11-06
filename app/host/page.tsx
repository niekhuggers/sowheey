'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function HostPage() {
  const router = useRouter()
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      })

      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      const room = await response.json()
      
      localStorage.setItem('hostToken', room.hostToken)
      localStorage.setItem('roomCode', room.code)
      
      router.push(`/room/${room.code}/host`)
    } catch (err) {
      setError('Failed to create room. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Host a Game</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium mb-2">
                Room Name
              </label>
              <Input
                id="roomName"
                type="text"
                placeholder="Enter a name for your room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !roomName.trim()}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}