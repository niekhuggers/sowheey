import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateGameStateSchema = z.object({
  roomCode: z.string(),
  gameState: z.enum(['SETUP', 'PRE_EVENT', 'LIVE_EVENT', 'COMPLETED']).optional(),
  currentRound: z.number().optional(),
})

// GET game state
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomCode = searchParams.get('roomCode')

  if (!roomCode) {
    return NextResponse.json({ error: 'Missing roomCode' }, { status: 400 })
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: true,
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            },
            aggregateScores: {
              where: {
                round: {
                  status: 'REVEALED'
                }
              },
              orderBy: { roundId: 'desc' },
              take: 1
            }
          }
        },
        questions: {
          orderBy: { sortOrder: 'asc' }
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            question: true,
            scores: {
              include: {
                participant: true
              }
            },
            teamScores: {
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

    // Transform data for frontend
    const gameState = {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        gameState: room.gameState,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        rosterLocked: room.rosterLocked,
        preEventLocked: room.preEventLocked,
        teamsLocked: room.teamsLocked,
      },
      participants: room.participants,
      teams: room.teams.map(team => ({
        id: team.id,
        name: team.name,
        members: team.members.map(member => member.participant.name),
        totalScore: team.aggregateScores[0]?.totalScore || 0,
        rank: team.aggregateScores[0]?.rank || 0,
      })),
      questions: room.questions,
      rounds: room.rounds,
      currentQuestion: room.questions[room.currentRound] || null,
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('Error fetching game state:', error)
    return NextResponse.json({ error: 'Failed to fetch game state' }, { status: 500 })
  }
}

// POST update game state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomCode, gameState, currentRound } = updateGameStateSchema.parse(body)

    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (gameState) updateData.gameState = gameState
    if (currentRound !== undefined) updateData.currentRound = currentRound

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      gameState: updatedRoom.gameState, 
      currentRound: updatedRoom.currentRound 
    })
  } catch (error) {
    console.error('Error updating game state:', error)
    return NextResponse.json({ error: 'Failed to update game state' }, { status: 500 })
  }
}