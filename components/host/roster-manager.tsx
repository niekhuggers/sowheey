'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'

interface RosterManagerProps {
  room: any
  participants: Participant[]
  onAction: (action: string, payload: any) => void
}

export function RosterManager({ room, participants, onAction }: RosterManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newParticipant, setNewParticipant] = useState({ name: '', avatarUrl: '' })
  const [showInviteLinks, setShowInviteLinks] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Try to add via API directly
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          name: newParticipant.name,
          avatarUrl: newParticipant.avatarUrl,
          hostToken: localStorage.getItem('hostToken'),
        }),
      })

      if (response.ok) {
        // Success - clear form and trigger refresh
        setNewParticipant({ name: '', avatarUrl: '' })
        setShowAddForm(false)
        
        // Also try Socket.IO action (optional)
        onAction('add-participant', newParticipant)
        
        // Force page refresh to show new participant
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to add participant: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding participant:', error)
      alert('Failed to add participant. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      try {
        const response = await fetch(`/api/participants/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostToken: localStorage.getItem('hostToken'),
          }),
        })

        if (response.ok) {
          // Also try Socket.IO action (optional)
          onAction('delete-participant', { id })
          
          // Force page refresh to show changes
          window.location.reload()
        } else {
          alert('Failed to delete participant')
        }
      } catch (error) {
        console.error('Error deleting participant:', error)
        alert('Failed to delete participant')
      }
    }
  }

  const copyInviteLink = (participant: Participant) => {
    const url = `${window.location.origin}/pre?room=${room.code}&token=${participant.inviteToken}`
    navigator.clipboard.writeText(url)
    alert('Invite link copied!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Roster Management</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowInviteLinks(!showInviteLinks)}
            >
              {showInviteLinks ? 'Hide' : 'Show'} Invite Links
            </Button>
            <Button
              variant="secondary"
              onClick={() => onAction('lock-roster', { locked: !room.rosterLocked })}
            >
              {room.rosterLocked ? 'Unlock' : 'Lock'} Roster
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={room.rosterLocked}
            >
              Add Participant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {showAddForm && (
              <form onSubmit={handleAdd} className="flex gap-2 p-4 bg-gray-50 rounded-lg">
                <Input
                  placeholder="Name"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  required
                  maxLength={50}
                />
                <Input
                  placeholder="Avatar URL (optional)"
                  value={newParticipant.avatarUrl}
                  onChange={(e) => setNewParticipant({ ...newParticipant, avatarUrl: e.target.value })}
                />
                <Button type="submit">Add</Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </form>
            )}

            <div className="grid gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {participant.avatarUrl ? (
                      <img
                        src={participant.avatarUrl}
                        alt={participant.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        {participant.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{participant.name}</span>
                    {participant.isGuest && (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">Guest</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {showInviteLinks && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-24">
                          <QRCodeSVG
                            value={`${window.location.origin}/pre?room=${room.code}&token=${participant.inviteToken}`}
                            size={96}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyInviteLink(participant)}
                        >
                          Copy Link
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(participant.id)}
                      disabled={room.rosterLocked}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {participants.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No participants yet. Add some to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}