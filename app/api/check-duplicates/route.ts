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

    // Get all TeamScore records grouped by round and team
    const teamScores = await prisma.teamScore.findMany({
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
        { team: { name: 'asc' } }
      ]
    })

    // Check for duplicates (same roundId + teamId)
    const scoreMap = new Map<string, any[]>()
    teamScores.forEach(score => {
      const key = `${score.roundId}-${score.teamId}`
      if (!scoreMap.has(key)) {
        scoreMap.set(key, [])
      }
      scoreMap.get(key)!.push(score)
    })

    const duplicates = Array.from(scoreMap.entries())
      .filter(([_, scores]) => scores.length > 1)
      .map(([key, scores]) => ({
        round: scores[0].round.roundNumber,
        question: scores[0].round.question.text,
        team: scores[0].team.name,
        duplicateCount: scores.length,
        points: scores.map(s => s.points),
        ids: scores.map(s => s.id)
      }))

    // Get TeamAggregateScore for comparison
    const aggregates = await prisma.teamAggregateScore.findMany({
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
        { round: { roundNumber: 'asc' } },
        { totalScore: 'desc' }
      ]
    })

    return NextResponse.json({
      totalTeamScores: teamScores.length,
      duplicatesFound: duplicates.length,
      duplicates: duplicates,
      allScores: teamScores.map(s => ({
        id: s.id,
        round: s.round.roundNumber,
        team: s.team.name,
        points: s.points,
        createdAt: s.createdAt
      })),
      aggregates: aggregates.map(a => ({
        round: a.round.roundNumber,
        team: a.team.name,
        totalScore: a.totalScore,
        rank: a.rank
      }))
    })
  } catch (error: any) {
    console.error('Error checking duplicates:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

