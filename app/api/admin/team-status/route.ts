import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomCode = searchParams.get('roomCode')

    if (!roomCode) {
      return NextResponse.json({ error: 'Missing roomCode' }, { status: 400 })
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        },
        devices: {
          where: {
            teamId: { not: null }
          },
          include: {
            team: true
          }
        },
        rounds: {
          where: {
            roundNumber: { gte: 1 }
          },
          orderBy: { roundNumber: 'desc' },
          take: 1,
          include: {
            teamSubmissions: {
              include: {
                team: true
              }
            }
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const currentRound = room.rounds[0]
    const teamStatus = room.teams.map(team => {
      const hasDevice = room.devices.some(d => d.teamId === team.id)
      const hasSubmitted = currentRound?.teamSubmissions.some(ts => ts.teamId === team.id) || false
      
      return {
        id: team.id,
        name: team.name,
        members: team.members.map(m => m.participant.name),
        deviceConnected: hasDevice,
        hasSubmitted: hasSubmitted,
        lastSeen: room.devices.find(d => d.teamId === team.id)?.lastSeenAt
      }
    })

    const stats = {
      totalTeams: room.teams.length,
      teamsConnected: teamStatus.filter(t => t.deviceConnected).length,
      teamsSubmitted: teamStatus.filter(t => t.hasSubmitted).length,
      currentRoundNumber: room.currentRound + 1,
      currentRoundStatus: currentRound?.status || 'WAITING'
    }

    return NextResponse.json({
      stats,
      teams: teamStatus
    })
  } catch (error: any) {
    console.error('Error fetching team status:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}

