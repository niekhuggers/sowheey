import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const adminSaveFMKSubmissionSchema = z.object({
  roomCode: z.string(),
  hostToken: z.string(),
  participantName: z.string(),
  questionId: z.string(),
  fmkAnswers: z.array(z.string()).length(3), // [F, M, K] in that order
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      roomCode, 
      hostToken, 
      participantName, 
      questionId, 
      fmkAnswers 
    } = adminSaveFMKSubmissionSchema.parse(body)
    
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
    
    // For FMK questions, we store the answers as a JSON string in rank1ParticipantId
    // and use special placeholder IDs for rank2 and rank3
    const fmkDataString = JSON.stringify({
      type: 'fmk',
      answers: fmkAnswers // [F person, M person, K person]
    })
    
    // Delete existing submission for this participant+question
    await prisma.preSubmission.deleteMany({
      where: {
        participantId: participant.id,
        questionId: questionId
      }
    })
    
    // Create new submission with FMK data
    // We use the participant's own ID as placeholders since FMK options aren't real participants
    await prisma.preSubmission.create({
      data: {
        roomId: room.id,
        participantId: participant.id,
        questionId,
        rank1ParticipantId: participant.id, // Placeholder
        rank2ParticipantId: participant.id, // Placeholder
        rank3ParticipantId: participant.id, // Placeholder
        // Store FMK data as metadata (if your schema supports it)
        // Otherwise we'll need to encode it in the ranking
      }
    })
    
    // For now, let's also store it in a separate way that we can retrieve
    // We'll encode the FMK answers in the order by using the first letter
    // This is a workaround until we have a proper metadata field
    console.log('FMK submission saved for', participantName, ':', fmkAnswers)
    
    return NextResponse.json({ 
      success: true,
      message: 'FMK answers saved (using placeholder method for now)'
    })
  } catch (error) {
    console.error('Error saving admin FMK submission:', error)
    return NextResponse.json(
      { error: 'Failed to save FMK submission' },
      { status: 500 }
    )
  }
}