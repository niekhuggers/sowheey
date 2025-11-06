'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Participant, Team } from '@/lib/types'
import { SmartTeamGrouper } from './smart-team-grouper'

interface TeamManagerProps {
  room: any
  participants: Participant[]
  onAction: (action: string, payload: any) => void
}

export function TeamManager({ room, participants, onAction }: TeamManagerProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', members: ['', ''] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeams()
  }, [room.id])

  const loadTeams = async () => {
    try {
      const response = await fetch(`/api/teams?roomId=${room.id}`)
      const data = await response.json()
      setTeams(data)
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          name: newTeam.name,
          participantIds: newTeam.members.filter(Boolean),
          hostToken: localStorage.getItem('hostToken'),
        }),
      })

      if (response.ok) {
        await loadTeams()
        setNewTeam({ name: '', members: ['', ''] })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const generatePairingCode = async (teamId: string) => {
    onAction('generate-team-pairing-code', { teamId })
  }

  const availableParticipants = participants.filter(
    (p) => !teams.some((t) => t.members?.some((m) => m.participantId === p.id))
  )

  return (
    <div className="space-y-6">
      {teams.length === 0 && (
        <SmartTeamGrouper
          room={room}
          participants={participants}
          onAction={onAction}
        />
      )}
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Management</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => onAction('lock-teams', { locked: !room.teamsLocked })}
            >
              {room.teamsLocked ? 'Unlock' : 'Lock'} Teams
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={room.teamsLocked || availableParticipants.length < 2}
            >
              Create Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading teams...</p>
          ) : (
            <div className="space-y-4">
              {showAddForm && (
                <form onSubmit={handleCreateTeam} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <Input
                    placeholder="Team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    required
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Team Members (2 required)</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newTeam.members[0]}
                      onChange={(e) =>
                        setNewTeam({ ...newTeam, members: [e.target.value, newTeam.members[1]] })
                      }
                      required
                    >
                      <option value="">Select member 1</option>
                      {availableParticipants.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === newTeam.members[1]}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      className="w-full p-2 border rounded-md"
                      value={newTeam.members[1]}
                      onChange={(e) =>
                        setNewTeam({ ...newTeam, members: [newTeam.members[0], e.target.value] })
                      }
                      required
                    >
                      <option value="">Select member 2</option>
                      {availableParticipants.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === newTeam.members[0]}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit">Create Team</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              <div className="grid gap-4">
                {teams.map((team) => (
                  <div key={team.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{team.name}</h3>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generatePairingCode(team.id)}
                      >
                        Generate Pairing Code
                      </Button>
                    </div>
                    
                    <div className="flex gap-4">
                      {team.members?.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          {member.participant?.avatarUrl ? (
                            <img
                              src={member.participant.avatarUrl}
                              alt={member.participant.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                              {member.participant?.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <span>{member.participant?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {teams.length === 0 && !showAddForm && (
                <p className="text-center text-gray-500 py-8">
                  No teams yet. Create teams from available participants.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}