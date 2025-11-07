import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        rounds: {
          select: {
            roundNumber: true,
            status: true
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check for any data that should be cleared
    const teamScores = await prisma.teamScore.count({
      where: {
        round: {
          roomId: room.id
        }
      }
    })

    const teamSubmissions = await prisma.teamSubmission.count({
      where: {
        round: {
          roomId: room.id
        }
      }
    })

    const teamAggregates = await prisma.teamAggregateScore.count({
      where: {
        round: {
          roomId: room.id
        }
      }
    })

    const revealedRounds = room.rounds.filter(r => r.status === 'REVEALED').length
    const waitingRounds = room.rounds.filter(r => r.status === 'WAITING').length

    const isCleanState = 
      room.currentRound === 0 &&
      teamScores === 0 &&
      teamSubmissions === 0 &&
      teamAggregates === 0 &&
      revealedRounds === 0

    return NextResponse.json({
      roomCode: 'WEEKEND2024',
      currentRound: room.currentRound,
      roundStatuses: {
        waiting: waitingRounds,
        revealed: revealedRounds,
        total: room.rounds.length
      },
      dataCounts: {
        teamScores,
        teamSubmissions,
        teamAggregates
      },
      isCleanState,
      status: isCleanState ? '✅ CLEAN - Ready to start fresh game' : '⚠️ Has data from previous game',
      recommendation: isCleanState 
        ? 'Good to go! Start Round 1.' 
        : 'Click "Reset Rounds Only" in admin to clear all data.'
    })
  } catch (error: any) {
    console.error('Verify reset error:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}

