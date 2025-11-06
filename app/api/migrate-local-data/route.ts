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

    // Create participants and questions from localStorage data first
    const PLAYERS = ['Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny']
    const HOSTS = ['Niek', 'Joep', 'Merijn']
    const ALL_PEOPLE = [...PLAYERS, ...HOSTS]
    
    const QUESTIONS = [
      'Wie gaan nooit trouwen?',
      'Wie heeft de minste ambitie?', 
      'Wie zegt het vaakst last minute af?',
      'Wie zijn gedoemd om irritante kinderen te krijgen?',
      'Wie belanden later in de gevangenis?',
      'Wie denken dat ze slim zijn, maar zijn het niet?',
      'Wie zijn het irritantst als ze dronken zijn?',
      'Wie verlaat altijd als laatste het huis?',
      'Wie heeft het grootste ego zonder reden?',
      'Wie gebruikt het meeste drugs?',
      'Wie zou stand-up comedian kunnen zijn?',
      'Wie trouwt met een veel jongere partner?',
      'Wie zou je peetoom van je kind maken?',
      'Wie poept het meest?',
      'Fuck, Marry, Kill: Aylin, Keone en Ceana'
    ]

    // Create participants if they don't exist
    for (const personName of ALL_PEOPLE) {
      const existing = await prisma.participant.findFirst({
        where: { roomId: room.id, name: personName }
      })
      
      if (!existing) {
        await prisma.participant.create({
          data: {
            roomId: room.id,
            name: personName,
            isHost: HOSTS.includes(personName),
            isGuest: false,
            inviteToken: crypto.randomUUID()
          }
        })
      }
    }

    // Create questions if they don't exist
    for (let i = 0; i < QUESTIONS.length; i++) {
      const existing = await prisma.question.findFirst({
        where: { roomId: room.id, sortOrder: i }
      })
      
      if (!existing) {
        await prisma.question.create({
          data: {
            roomId: room.id,
            text: QUESTIONS[i],
            category: QUESTIONS[i].includes('Fuck, Marry, Kill') ? 'special' : 'general',
            sortOrder: i
          }
        })
      }
    }

    // Refresh room data with the new participants and questions
    const updatedRoom = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: true,
        questions: { orderBy: { sortOrder: 'asc' } }
      }
    })

    if (!updatedRoom) {
      return NextResponse.json(
        { error: 'Failed to reload room data' },
        { status: 500 }
      )
    }

    // Migrate pre-submissions (friendsWeekendAnswers)
    if (localData.friendsWeekendAnswers) {
      for (const [participantName, answers] of Object.entries(localData.friendsWeekendAnswers)) {
        const participant = updatedRoom.participants.find(p => p.name === participantName)
        if (!participant) continue

        for (const [questionIndex, ranking] of Object.entries(answers)) {
          const qIndex = parseInt(questionIndex)
          const question = updatedRoom.questions[qIndex]
          if (!question || !ranking || ranking.length !== 3) continue

          // Find participant IDs for the ranked people
          const rank1Participant = updatedRoom.participants.find(p => p.name === ranking[0])
          const rank2Participant = updatedRoom.participants.find(p => p.name === ranking[1]) 
          const rank3Participant = updatedRoom.participants.find(p => p.name === ranking[2])
          
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
                  roomId: updatedRoom.id,
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

    // Migrate teams (after creating participants)
    if (localData.teams && localData.teams.length > 0) {
      for (const teamData of localData.teams) {
        // Check if team already exists
        const existingTeam = await prisma.team.findFirst({
          where: { roomId: updatedRoom.id, name: teamData.name }
        })
        
        if (!existingTeam) {
          // Find participant IDs for team members
          const memberIds: string[] = []
          for (const memberName of teamData.members) {
            const participant = updatedRoom.participants.find(p => p.name === memberName)
            if (participant) {
              memberIds.push(participant.id)
            }
          }
          
          if (memberIds.length === 2) {
            // Create team with members
            await prisma.team.create({
              data: {
                roomId: updatedRoom.id,
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