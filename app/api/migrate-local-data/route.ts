import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const migrateDataSchema = z.object({
  roomCode: z.string(),
  hostToken: z.string(),
  localData: z.object({
    friendsWeekendAnswers: z.record(z.string(), z.record(z.string(), z.array(z.string()))).optional(),
    teams: z.array(z.object({
      id: z.number(),
      name: z.string(),
      members: z.array(z.string()),
      score: z.number().optional()
    })).optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomCode, hostToken, localData } = migrateDataSchema.parse(body)
    
    // Verify room and host token
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: true,
        questions: { orderBy: { sortOrder: 'asc' } }
      }
    })
    
    if (!room || room.hostToken !== hostToken) {
      return NextResponse.json(
        { error: 'Invalid room or host token' },
        { status: 401 }
      )
    }

    let migratedItems = {
      teams: 0,
      preSubmissions: 0
    }

    // Migrate teams
    if (localData.teams && localData.teams.length > 0) {
      for (const teamData of localData.teams) {
        // Find participant IDs for team members
        const memberIds: string[] = []
        for (const memberName of teamData.members) {
          const participant = room.participants.find(p => p.name === memberName)
          if (participant) {
            memberIds.push(participant.id)
          }
        }
        
        if (memberIds.length === 2) {
          // Create team with members
          const team = await prisma.team.create({
            data: {
              roomId: room.id,
              name: teamData.name,
              members: {
                create: memberIds.map(participantId => ({
                  participantId
                }))
              }
            }
          })
          migratedItems.teams++
        }
      }
    }

    // Migrate pre-submissions (friendsWeekendAnswers)
    if (localData.friendsWeekendAnswers) {
      for (const [participantName, answers] of Object.entries(localData.friendsWeekendAnswers)) {
        const participant = room.participants.find(p => p.name === participantName)
        if (!participant) continue

        for (const [questionIndex, ranking] of Object.entries(answers)) {
          const qIndex = parseInt(questionIndex)
          const question = room.questions[qIndex]
          if (!question || !ranking || ranking.length !== 3) continue

          // Find participant IDs for the ranked people
          const rank1Participant = room.participants.find(p => p.name === ranking[0])
          const rank2Participant = room.participants.find(p => p.name === ranking[1]) 
          const rank3Participant = room.participants.find(p => p.name === ranking[2])
          
          if (rank1Participant && rank2Participant && rank3Participant) {
            // Check if pre-submission already exists
            const existing = await prisma.preSubmission.findUnique({
              where: {
                participantId_questionId: {
                  participantId: participant.id,
                  questionId: question.id
                }
              }
            })
            
            if (!existing) {
              await prisma.preSubmission.create({
                data: {
                  roomId: room.id,
                  participantId: participant.id,
                  questionId: question.id,
                  rank1ParticipantId: rank1Participant.id,
                  rank2ParticipantId: rank2Participant.id,
                  rank3ParticipantId: rank3Participant.id
                }
              })
              migratedItems.preSubmissions++
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      migrated: migratedItems,
      message: `Successfully migrated ${migratedItems.teams} teams and ${migratedItems.preSubmissions} pre-submissions`
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}