import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get all rounds
    const rounds = await prisma.round.findMany({
      where: { roomId: room.id },
      include: {
        question: true,
        teamSubmissions: true,
        teamScores: true,
        teamAggregateScores: {
          include: {
            team: true
          }
        }
      },
      orderBy: { roundNumber: 'asc' }
    })

    // Get all team aggregate scores
    const allAggregates = await prisma.teamAggregateScore.findMany({
      where: {
        round: {
          roomId: room.id
        }
      },
      include: {
        team: true,
        round: {
          include: {
            question: true
          }
        }
      },
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { rank: 'asc' }
      ]
    })

    // Get all team scores
    const allTeamScores = await prisma.teamScore.findMany({
      where: {
        round: {
          roomId: room.id
        }
      },
      include: {
        team: true,
        round: true
      },
      orderBy: [
        { round: { roundNumber: 'asc' } }
      ]
    })

    return NextResponse.json({
      summary: {
        totalRounds: rounds.length,
        revealedRounds: rounds.filter(r => r.status === 'REVEALED').length,
        teamScoreRecords: allTeamScores.length,
        teamAggregateRecords: allAggregates.length
      },
      rounds: rounds.map(r => ({
        roundNumber: r.roundNumber,
        status: r.status,
        question: r.question?.text,
        teamSubmissions: r.teamSubmissions.length,
        teamScores: r.teamScores.length,
        teamAggregates: r.teamAggregateScores.length,
        completedAt: r.completedAt
      })),
      teamScores: allTeamScores.map(ts => ({
        round: ts.round.roundNumber,
        team: ts.team.name,
        points: ts.points,
        createdAt: ts.createdAt
      })),
      teamAggregates: allAggregates.map(ta => ({
        round: ta.round.roundNumber,
        roundStatus: ta.round.status,
        team: ta.team.name,
        totalScore: ta.totalScore,
        rank: ta.rank,
        createdAt: ta.createdAt
      }))
    })
  } catch (error: any) {
    console.error('Debug scores error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

