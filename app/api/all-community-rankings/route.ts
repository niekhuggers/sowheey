import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePositionScores, determineTop3 } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' }
        },
        participants: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const allRankings = await Promise.all(
      room.questions.map(async (question) => {
        // Get pre-submissions for this question
        const preSubmissions = await prisma.preSubmission.findMany({
          where: {
            roomId: room.id,
            questionId: question.id
          },
          include: {
            rank1Participant: true,
            rank2Participant: true,
            rank3Participant: true
          }
        })

        // Calculate community ranking
        const preSubmissionRankings = preSubmissions.map(sub => ({
          rank1Id: sub.rank1ParticipantId,
          rank2Id: sub.rank2ParticipantId,
          rank3Id: sub.rank3ParticipantId,
        }))

        const positionScores = calculatePositionScores(preSubmissionRankings)
        const communityTop3 = determineTop3(positionScores)

        // Get names
        const rank1 = room.participants.find(p => p.id === communityTop3.rank1Id)
        const rank2 = room.participants.find(p => p.id === communityTop3.rank2Id)
        const rank3 = room.participants.find(p => p.id === communityTop3.rank3Id)

        return {
          questionNumber: question.sortOrder + 1,
          question: question.text,
          submissionCount: preSubmissions.length,
          communityTop3: {
            rank1: rank1?.name || 'Unknown',
            rank2: rank2?.name || 'Unknown',
            rank3: rank3?.name || 'Unknown'
          }
        }
      })
    )

    return NextResponse.json({
      roomCode: 'WEEKEND2024',
      rankings: allRankings
    })
  } catch (error: any) {
    console.error('Error calculating all community rankings:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}

