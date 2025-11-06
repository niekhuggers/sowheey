import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomCode = searchParams.get('roomCode')
  
  if (!roomCode) {
    return NextResponse.json({ error: 'Room code required' }, { status: 400 })
  }
  
  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    // Get latest round for aggregate scores
    const latestRound = await prisma.round.findFirst({
      where: { roomId: room.id, status: 'REVEALED' },
      orderBy: { roundNumber: 'desc' },
    })
    
    let participants: any[] = []
    let teams: any[] = []
    
    if (latestRound) {
      // Get individual scores
      const aggregateScores = await prisma.aggregateScore.findMany({
        where: { roundId: latestRound.id },
        include: {
          participant: true,
        },
        orderBy: { rank: 'asc' },
      })
      
      participants = aggregateScores.map((score) => ({
        id: score.participant.id,
        name: score.participant.name,
        avatarUrl: score.participant.avatarUrl,
        totalScore: score.totalScore,
        rank: score.rank,
      }))
      
      // Get team scores
      const teamAggregateScores = await prisma.teamAggregateScore.findMany({
        where: { roundId: latestRound.id },
        include: {
          team: {
            include: {
              members: {
                include: {
                  participant: true,
                },
              },
            },
          },
        },
        orderBy: { rank: 'asc' },
      })
      
      teams = teamAggregateScores.map((teamScore) => ({
        id: teamScore.team.id,
        name: teamScore.team.name,
        totalScore: teamScore.totalScore,
        rank: teamScore.rank,
        members: teamScore.team.members.map((member) => ({
          name: member.participant.name,
          avatarUrl: member.participant.avatarUrl,
        })),
      }))
    }
    
    return NextResponse.json({ participants, teams })
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    )
  }
}