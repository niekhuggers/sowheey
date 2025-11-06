import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const debugSchema = z.object({
  localData: z.object({
    friendsWeekendAnswers: z.any().optional(),
    teams: z.array(z.any()).optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { localData } = debugSchema.parse(body)
    
    // Check what data we received
    console.log('=== MIGRATION DEBUG ===')
    console.log('friendsWeekendAnswers:', localData.friendsWeekendAnswers)
    console.log('teams:', localData.teams)
    
    // Check if WEEKEND2024 room exists
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        participants: true,
        questions: true,
        teams: {
          include: {
            members: true
          }
        }
      }
    })
    
    if (!room) {
      return NextResponse.json({
        error: 'WEEKEND2024 room not found',
        receivedData: {
          answersKeys: localData.friendsWeekendAnswers ? Object.keys(localData.friendsWeekendAnswers) : [],
          teamsCount: localData.teams?.length || 0,
          teamsData: localData.teams
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        roomExists: !!room,
        participantCount: room.participants.length,
        questionCount: room.questions.length,
        existingTeamsCount: room.teams.length,
        receivedAnswersKeys: localData.friendsWeekendAnswers ? Object.keys(localData.friendsWeekendAnswers) : [],
        receivedTeamsCount: localData.teams?.length || 0,
        receivedTeamsData: localData.teams,
        roomData: {
          participants: room.participants.map(p => p.name),
          questions: room.questions.map(q => q.text).slice(0, 3) // First 3 questions
        }
      }
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}