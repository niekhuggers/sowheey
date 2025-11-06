import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        rounds: {
          include: {
            question: true
          },
          orderBy: { roundNumber: 'asc' }
        },
        participants: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const roundsWithRankings = room.rounds.map(round => {
      const rank1 = room.participants.find(p => p.id === round.communityRank1Id)
      const rank2 = room.participants.find(p => p.id === round.communityRank2Id)
      const rank3 = room.participants.find(p => p.id === round.communityRank3Id)

      return {
        roundNumber: round.roundNumber,
        question: round.question.text,
        status: round.status,
        communityTop3: {
          rank1: rank1?.name || 'Not calculated yet',
          rank2: rank2?.name || 'Not calculated yet',
          rank3: rank3?.name || 'Not calculated yet'
        }
      }
    })

    return NextResponse.json({
      room: 'WEEKEND2024',
      rounds: roundsWithRankings
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error: any) {
    console.error('Error fetching community rankings:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

