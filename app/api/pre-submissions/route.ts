import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const submitPreEventSchema = z.object({
  inviteToken: z.string(),
  roomCode: z.string(),
  submissions: z.array(
    z.object({
      questionId: z.string(),
      rank1ParticipantId: z.string(),
      rank2ParticipantId: z.string(),
      rank3ParticipantId: z.string(),
    })
  ),
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomId = searchParams.get('roomId')
  
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
  }
  
  try {
    const preSubmissions = await prisma.preSubmission.findMany({
      where: { roomId },
      include: {
        participant: true,
        rank1Participant: true,
        rank2Participant: true,
        rank3Participant: true,
        question: true
      },
      orderBy: [
        { participant: { name: 'asc' } },
        { question: { sortOrder: 'asc' } }
      ]
    })
    
    return NextResponse.json(preSubmissions)
  } catch (error) {
    console.error('Error fetching pre-submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pre-submissions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteToken, roomCode, submissions } = submitPreEventSchema.parse(body)
    
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    if (room.preEventLocked) {
      return NextResponse.json(
        { error: 'Pre-event submissions are locked' },
        { status: 400 }
      )
    }
    
    const participant = await prisma.participant.findUnique({
      where: { inviteToken },
    })
    
    if (!participant || participant.roomId !== room.id) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 401 })
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.preSubmission.deleteMany({
        where: { participantId: participant.id },
      })
      
      await tx.preSubmission.createMany({
        data: submissions.map((submission) => ({
          roomId: room.id,
          participantId: participant.id,
          ...submission,
        })),
      })
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting pre-event:', error)
    return NextResponse.json(
      { error: 'Failed to submit pre-event rankings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const inviteToken = searchParams.get('inviteToken')
  const roomCode = searchParams.get('roomCode')
  
  if (!inviteToken || !roomCode) {
    return NextResponse.json(
      { error: 'Invite token and room code required' },
      { status: 400 }
    )
  }
  
  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    const participant = await prisma.participant.findUnique({
      where: { inviteToken },
    })
    
    if (!participant || participant.roomId !== room.id) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 401 })
    }
    
    const submissions = await prisma.preSubmission.findMany({
      where: { participantId: participant.id },
      include: {
        question: true,
        rank1Participant: true,
        rank2Participant: true,
        rank3Participant: true,
      },
    })
    
    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Error fetching pre-submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pre-submissions' },
      { status: 500 }
    )
  }
}