import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTeamSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(50),
  participantIds: z.array(z.string()).min(2).max(2),
  hostToken: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, name, participantIds, hostToken } = createTeamSchema.parse(body)
    
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })
    
    if (!room || room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (room.teamsLocked) {
      return NextResponse.json({ error: 'Teams are locked' }, { status: 400 })
    }
    
    const existingTeamMembers = await prisma.teamMember.findMany({
      where: {
        participantId: { in: participantIds },
        team: { roomId },
      },
    })
    
    if (existingTeamMembers.length > 0) {
      return NextResponse.json(
        { error: 'One or more participants are already in a team' },
        { status: 400 }
      )
    }
    
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          roomId,
          name,
        },
      })
      
      await tx.teamMember.createMany({
        data: participantIds.map((participantId) => ({
          teamId: newTeam.id,
          participantId,
        })),
      })
      
      return await tx.team.findUnique({
        where: { id: newTeam.id },
        include: {
          members: {
            include: {
              participant: true,
            },
          },
        },
      })
    })
    
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomId = searchParams.get('roomId')
  
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
  }
  
  try {
    const teams = await prisma.team.findMany({
      where: { roomId },
      include: {
        members: {
          include: {
            participant: true,
          },
        },
        aggregateScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    
    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}