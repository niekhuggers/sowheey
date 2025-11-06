import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const adminSavePreSubmissionSchema = z.object({
  roomCode: z.string(),
  hostToken: z.string(),
  participantName: z.string(),
  questionId: z.string(),
  rank1ParticipantId: z.string(),
  rank2ParticipantId: z.string(),
  rank3ParticipantId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      roomCode, 
      hostToken, 
      participantName, 
      questionId, 
      rank1ParticipantId, 
      rank2ParticipantId, 
      rank3ParticipantId 
    } = adminSavePreSubmissionSchema.parse(body)
    
    // Verify room and host token
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { participants: true }
    })
    
    if (!room || room.hostToken !== hostToken) {
      return NextResponse.json(
        { error: 'Invalid room or host token' },
        { status: 401 }
      )
    }
    
    // Find the participant
    const participant = room.participants.find(p => p.name === participantName)
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }
    
    // Delete existing submission for this participant+question
    await prisma.preSubmission.deleteMany({
      where: {
        participantId: participant.id,
        questionId: questionId
      }
    })
    
    // Create new submission
    await prisma.preSubmission.create({
      data: {
        roomId: room.id,
        participantId: participant.id,
        questionId,
        rank1ParticipantId,
        rank2ParticipantId,
        rank3ParticipantId
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving admin pre-submission:', error)
    return NextResponse.json(
      { error: 'Failed to save pre-submission' },
      { status: 500 }
    )
  }
}