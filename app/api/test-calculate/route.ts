import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check what rounds exist
    const rounds = await prisma.round.findMany({
      where: {
        room: { code: 'WEEKEND2024' }
      },
      include: {
        question: true,
        teamSubmissions: {
          include: {
            team: true
          }
        },
        scores: true,
        teamScores: true
      },
      orderBy: { roundNumber: 'asc' }
    })

    // Check team score table
    const allTeamScores = await prisma.teamScore.findMany({
      include: {
        team: true,
        round: true
      }
    })

    // Check pre-submissions
    const preSubmissions = await prisma.preSubmission.findMany({
      where: {
        room: { code: 'WEEKEND2024' }
      }
    })

    return NextResponse.json({
      rounds: rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        status: r.status,
        question: r.question?.text,
        teamSubmissions: r.teamSubmissions.length,
        scores: r.scores.length,
        teamScores: r.teamScores.length,
        completedAt: r.completedAt
      })),
      allTeamScores: allTeamScores.map(ts => ({
        roundNumber: ts.round.roundNumber,
        team: ts.team.name,
        points: ts.points,
        createdAt: ts.createdAt
      })),
      preSubmissionsCount: preSubmissions.length,
      environment: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL
      }
    })
  } catch (error: any) {
    console.error('Test calculate error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

