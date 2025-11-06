import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking database contents...')
    
    // Check if WEEKEND2024 room exists
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        participants: {
          orderBy: { name: 'asc' }
        },
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        questions: {
          orderBy: { sortOrder: 'asc' }
        },
        preSubmissions: {
          take: 5 // Just first 5 for debugging
        }
      }
    })

    if (!room) {
      return NextResponse.json({
        error: 'WEEKEND2024 room not found',
        allRooms: await prisma.room.findMany({
          select: { code: true, name: true, id: true }
        })
      })
    }

    const debugData = {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        gameState: room.gameState,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        hostToken: room.hostToken
      },
      counts: {
        participants: room.participants.length,
        teams: room.teams.length,
        questions: room.questions.length,
        preSubmissions: room.preSubmissions.length
      },
      participants: room.participants.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
      })),
      teams: room.teams.map(t => ({
        id: t.id,
        name: t.name,
        memberCount: t.members.length,
        members: t.members.map(m => m.participant.name)
      })),
      questions: room.questions.slice(0, 3).map(q => ({ // First 3 questions
        id: q.id,
        text: q.text,
        sortOrder: q.sortOrder
      })),
      samplePreSubmissions: room.preSubmissions.slice(0, 2) // First 2 pre-submissions
    }

    return NextResponse.json(debugData)
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}