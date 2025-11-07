import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roundId = searchParams.get('roundId')

    if (!roundId) {
      return NextResponse.json({ error: 'Missing roundId' }, { status: 400 })
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        question: true,
        teamSubmissions: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    participant: true
                  }
                }
              }
            }
          }
        },
        teamScores: {
          include: {
            team: true
          }
        }
      }
    })

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Get all participants for name lookup
    const participants = await prisma.participant.findMany({
      where: { roomId: round.roomId }
    })

    const participantMap = new Map(participants.map(p => [p.id, p.name]))

    const submissions = round.teamSubmissions.map(ts => ({
      team: ts.team.name,
      teamMembers: ts.team.members.map(m => m.participant.name),
      submission: {
        rank1: participantMap.get(ts.rank1Id),
        rank2: participantMap.get(ts.rank2Id),
        rank3: participantMap.get(ts.rank3Id)
      },
      score: round.teamScores.find(score => score.teamId === ts.teamId)?.points || null,
      submittedAt: ts.submittedAt
    }))

    // Get community ranking from round
    const communityTop3 = {
      rank1: participantMap.get(round.communityRank1Id || ''),
      rank2: participantMap.get(round.communityRank2Id || ''),
      rank3: participantMap.get(round.communityRank3Id || '')
    }

    return NextResponse.json({
      round: {
        number: round.roundNumber,
        question: round.question.text,
        status: round.status
      },
      communityTop3,
      submissions,
      summary: {
        totalSubmissions: submissions.length,
        calculated: round.status === 'REVEALED'
      }
    })
  } catch (error: any) {
    console.error('Error fetching round submissions:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}

