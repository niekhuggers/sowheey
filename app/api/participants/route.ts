import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createParticipantSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(50),
  avatarUrl: z.string().optional(),
  hostToken: z.string(),
  isHost: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, name, avatarUrl, hostToken, isHost } = createParticipantSchema.parse(body)
    
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })
    
    if (!room || room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (room.rosterLocked) {
      return NextResponse.json({ error: 'Roster is locked' }, { status: 400 })
    }
    
    const existing = await prisma.participant.findFirst({
      where: { roomId, name },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Participant with this name already exists' },
        { status: 400 }
      )
    }
    
    const participant = await prisma.participant.create({
      data: {
        roomId,
        name,
        avatarUrl,
        inviteToken: crypto.randomUUID(),
        isHost: isHost || false,
      },
    })
    
    return NextResponse.json(participant)
  } catch (error) {
    console.error('Error creating participant:', error)
    return NextResponse.json(
      { error: 'Failed to create participant' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomCode = searchParams.get('roomCode')
  const inviteToken = searchParams.get('inviteToken')
  
  if (!roomCode) {
    return NextResponse.json({ error: 'Room code required' }, { status: 400 })
  }
  
  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    let participants
    
    if (inviteToken) {
      const participant = await prisma.participant.findUnique({
        where: { inviteToken },
      })
      
      if (!participant || participant.roomId !== room.id) {
        return NextResponse.json({ error: 'Invalid invite token' }, { status: 401 })
      }
      
      participants = [participant]
    } else {
      participants = await prisma.participant.findMany({
        where: { roomId: room.id },
        orderBy: { name: 'asc' },
      })
    }
    
    return NextResponse.json(participants)
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}