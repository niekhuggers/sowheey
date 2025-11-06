import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePositionScores, determineTop3, calculateParticipantScore } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { hostToken } = body
    
    const round = await prisma.round.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        submissions: {
          include: {
            participant: true,
          },
        },
      },
    })
    
    if (!round || round.room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (round.status !== 'CLOSED') {
      return NextResponse.json({ error: 'Round is not closed' }, { status: 400 })
    }
    
    // Calculate position scores
    const positionScores = calculatePositionScores(round.submissions)
    const communityTop3 = determineTop3(positionScores)
    
    // Calculate individual scores
    const scores: { participantId: string; points: number }[] = []
    
    for (const submission of round.submissions) {
      const points = calculateParticipantScore(
        {
          rank1Id: submission.rank1Id,
          rank2Id: submission.rank2Id,
          rank3Id: submission.rank3Id,
        },
        communityTop3
      )
      
      scores.push({
        participantId: submission.participantId,
        points,
      })
    }
    
    // Save scores to database
    await prisma.$transaction(async (tx) => {
      // Delete existing scores for this round
      await tx.score.deleteMany({
        where: { roundId: round.id },
      })
      
      // Create new scores
      if (scores.length > 0) {
        await tx.score.createMany({
          data: scores.map((score) => ({
            roundId: round.id,
            participantId: score.participantId,
            points: score.points,
          })),
        })
      }
      
      // Calculate aggregate scores
      const allScores = await tx.score.findMany({
        where: {
          round: {
            roomId: round.roomId,
            status: 'REVEALED',
          },
        },
        include: {
          participant: true,
        },
      })
      
      const aggregates = new Map<string, { participantId: string; totalScore: number }>()
      
      allScores.forEach((score) => {
        const current = aggregates.get(score.participantId) || {
          participantId: score.participantId,
          totalScore: 0,
        }
        current.totalScore += score.points
        aggregates.set(score.participantId, current)
      })
      
      // Sort by score for ranking
      const sortedAggregates = Array.from(aggregates.values()).sort(
        (a, b) => b.totalScore - a.totalScore
      )
      
      // Delete existing aggregate scores for this round
      await tx.aggregateScore.deleteMany({
        where: { roundId: round.id },
      })
      
      // Create new aggregate scores
      if (sortedAggregates.length > 0) {
        await tx.aggregateScore.createMany({
          data: sortedAggregates.map((agg, index) => ({
            roundId: round.id,
            participantId: agg.participantId,
            totalScore: agg.totalScore,
            rank: index + 1,
          })),
        })
      }
      
      // Calculate team scores
      const teams = await tx.team.findMany({
        where: { roomId: round.roomId },
        include: {
          members: {
            include: {
              participant: true,
            },
          },
        },
      })
      
      const teamScores = teams.map((team) => {
        const teamTotalScore = team.members.reduce((total, member) => {
          const memberAggregate = aggregates.get(member.participantId)
          return total + (memberAggregate?.totalScore || 0)
        }, 0)
        
        return {
          teamId: team.id,
          totalScore: teamTotalScore,
        }
      }).sort((a, b) => b.totalScore - a.totalScore)
      
      // Delete existing team aggregate scores for this round
      await tx.teamAggregateScore.deleteMany({
        where: { roundId: round.id },
      })
      
      // Create new team aggregate scores
      if (teamScores.length > 0) {
        await tx.teamAggregateScore.createMany({
          data: teamScores.map((teamScore, index) => ({
            roundId: round.id,
            teamId: teamScore.teamId,
            totalScore: teamScore.totalScore,
            rank: index + 1,
          })),
        })
      }
    })
    
    return NextResponse.json(communityTop3)
  } catch (error) {
    console.error('Error calculating round results:', error)
    return NextResponse.json(
      { error: 'Failed to calculate results' },
      { status: 500 }
    )
  }
}