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
        teamSubmissions: {
          include: {
            team: true,
          },
        },
        question: true,
      },
    })
    
    if (!round || round.room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (round.status !== 'CLOSED') {
      return NextResponse.json({ error: 'Round is not closed' }, { status: 400 })
    }
    
    // Get pre-submissions for this question to determine community ranking
    const preSubmissions = await prisma.preSubmission.findMany({
      where: {
        roomId: round.roomId,
        questionId: round.questionId,
      },
      include: {
        participant: true,
        rank1Participant: true,
        rank2Participant: true,
        rank3Participant: true,
      },
    })

    console.log(`Calculating community ranking from ${preSubmissions.length} pre-submissions for question ${round.questionId}`)

    // Calculate community ranking from pre-submissions (not live submissions!)
    const preSubmissionRankings = preSubmissions.map(sub => ({
      rank1Id: sub.rank1ParticipantId,
      rank2Id: sub.rank2ParticipantId,
      rank3Id: sub.rank3ParticipantId,
    }))

    const positionScores = calculatePositionScores(preSubmissionRankings)
    const communityTop3 = determineTop3(positionScores)
    
    console.log('Community top 3 from pre-submissions:', communityTop3)
    
    // Calculate individual scores by comparing live submissions against community ranking
    const scores: { participantId: string; points: number }[] = []
    
    // Only process individual submissions if no team submissions exist
    if (round.teamSubmissions.length === 0) {
      for (const submission of round.submissions) {
        const points = calculateParticipantScore(
          {
            rank1Id: submission.rank1Id,
            rank2Id: submission.rank2Id,
            rank3Id: submission.rank3Id,
          },
          communityTop3
        )
        
        console.log(`Participant ${submission.participant.name} scored ${points} points for their live submission`)
        
        scores.push({
          participantId: submission.participantId,
          points,
        })
      }
    } else {
      console.log(`Skipping individual scoring - found ${round.teamSubmissions.length} team submissions`)
    }
    
    // Calculate team scores by comparing team submissions against community ranking
    const teamScores: { teamId: string; points: number }[] = []
    
    console.log(`🎯 Processing ${round.teamSubmissions.length} team submissions`)
    
    for (const teamSubmission of round.teamSubmissions) {
      const points = calculateParticipantScore(
        {
          rank1Id: teamSubmission.rank1Id,
          rank2Id: teamSubmission.rank2Id,
          rank3Id: teamSubmission.rank3Id,
        },
        communityTop3
      )
      
      console.log(`Team ${teamSubmission.team.name} scored ${points} points for their submission`)
      console.log(`  - Submission: rank1=${teamSubmission.rank1Id}, rank2=${teamSubmission.rank2Id}, rank3=${teamSubmission.rank3Id}`)
      console.log(`  - Community: rank1=${communityTop3.rank1Id}, rank2=${communityTop3.rank2Id}, rank3=${communityTop3.rank3Id}`)
      
      teamScores.push({
        teamId: teamSubmission.teamId,
        points,
      })
    }
    
    console.log(`📊 Total team scores to save: ${teamScores.length}`)
    
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
      
      // Delete existing team scores for this round
      console.log(`🗑️ Deleting existing team scores for round ${round.id}`)
      await tx.teamScore.deleteMany({
        where: { roundId: round.id },
      })
      console.log(`✅ Deleted existing team scores`)
      
      // Create new team scores
      if (teamScores.length > 0) {
        console.log(`💾 Creating ${teamScores.length} TeamScore records...`)
        console.log(`Data to save:`, teamScores.map((teamScore) => ({
          roundId: round.id,
          teamId: teamScore.teamId,
          points: teamScore.points,
        })))
        
        try {
          await tx.teamScore.createMany({
            data: teamScores.map((teamScore) => ({
              roundId: round.id,
              teamId: teamScore.teamId,
              points: teamScore.points,
            })),
          })
          console.log(`✅ TeamScore records created successfully!`)
        } catch (teamScoreError) {
          console.error(`❌ FAILED to create TeamScore records:`, teamScoreError)
          throw teamScoreError
        }
      } else {
        console.log(`⚠️ No team scores to save (teamScores.length = 0)`)
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
      
      // Calculate team aggregate scores
      // If teams have TeamScore records (team-based submissions), use those
      // Otherwise, sum individual member scores (individual-based submissions)
      const teams = await tx.team.findMany({
        where: { roomId: round.roomId },
        include: {
          scores: {
            where: {
              round: {
                status: { in: ['REVEALED', 'CLOSED'] }
              }
            }
          },
          members: {
            include: {
              participant: {
                include: {
                  scores: {
                    where: {
                      round: {
                        roomId: round.roomId,
                        status: { in: ['REVEALED', 'CLOSED'] }
                      }
                    }
                  }
                }
              }
            }
          }
        },
      })
      
      const teamAggregateScores = teams.map((team) => {
        // Try to use TeamScore records first (team-based submissions)
        let teamTotalScore = team.scores.reduce((total, score) => {
          return total + score.points
        }, 0)
        
        // If no TeamScore records exist, fall back to summing individual member scores
        if (teamTotalScore === 0 && team.members.length > 0) {
          teamTotalScore = team.members.reduce((total, member) => {
            const memberTotal = member.participant.scores.reduce((sum, score) => {
              return sum + score.points
            }, 0)
            return total + memberTotal
          }, 0)
          
          console.log(`Team ${team.name}: Calculated ${teamTotalScore} from ${team.members.length} member scores`)
        }
        
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
      if (teamAggregateScores.length > 0) {
        await tx.teamAggregateScore.createMany({
          data: teamAggregateScores.map((teamScore, index) => ({
            roundId: round.id,
            teamId: teamScore.teamId,
            totalScore: teamScore.totalScore,
            rank: index + 1,
          })),
        })
      }

      // Mark round as REVEALED
      await tx.round.update({
        where: { id: round.id },
        data: { 
          status: 'REVEALED',
          completedAt: new Date()
        }
      })
    })
    
    console.log(`✅ Round ${round.id} marked as REVEALED and scores calculated`)
    
    return NextResponse.json(communityTop3)
  } catch (error) {
    console.error('Error calculating round results:', error)
    return NextResponse.json(
      { error: 'Failed to calculate results' },
      { status: 500 }
    )
  }
}