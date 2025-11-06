import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRoomCode } from '@/lib/utils'
import { defaultQuestions } from '@/lib/default-questions'
import { z } from 'zod'

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().optional(),
  participants: z.array(z.object({
    name: z.string(),
    isHost: z.boolean(),
    isGuest: z.boolean(),
  })).optional(),
  questions: z.array(z.object({
    text: z.string(),
    category: z.string(),
    sortOrder: z.number(),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code: requestedCode, participants, questions } = createRoomSchema.parse(body)
    
    let code: string
    
    if (requestedCode) {
      // Check if requested code already exists
      const existing = await prisma.room.findUnique({ where: { code: requestedCode } })
      if (existing) {
        return NextResponse.json(
          { error: 'Room code already exists' },
          { status: 409 }
        )
      }
      code = requestedCode
    } else {
      // Generate random code
      let attempts = 0
      do {
        code = generateRoomCode()
        const existing = await prisma.room.findUnique({ where: { code } })
        if (!existing) break
        attempts++
      } while (attempts < 10)
    }
    
    const room = await prisma.room.create({
      data: {
        name,
        code,
        hostToken: crypto.randomUUID(),
      },
    })
    
    // Create questions (use provided or defaults)
    const questionsToCreate = questions || defaultQuestions
    await prisma.question.createMany({
      data: questionsToCreate.map((q) => ({
        roomId: room.id,
        text: q.text,
        category: q.category,
        sortOrder: q.sortOrder,
      })),
    })
    
    // Create participants if provided
    let createdParticipants: any[] = []
    if (participants && participants.length > 0) {
      const participantPromises = participants.map(p => 
        prisma.participant.create({
          data: {
            roomId: room.id,
            name: p.name,
            isHost: p.isHost,
            isGuest: p.isGuest,
            inviteToken: crypto.randomUUID(),
          }
        })
      )
      createdParticipants = await Promise.all(participantPromises)
    }
    
    // Get created questions to return
    const createdQuestions = await prisma.question.findMany({
      where: { roomId: room.id },
      orderBy: { sortOrder: 'asc' }
    })
    
    return NextResponse.json({
      room,
      participants: createdParticipants,
      questions: createdQuestions
    })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const hostToken = searchParams.get('hostToken')
  
  if (!code) {
    return NextResponse.json({ error: 'Room code required' }, { status: 400 })
  }
  
  try {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        participants: true,
        teams: {
          include: {
            members: {
              include: {
                participant: true,
              },
            },
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        rounds: {
          orderBy: { roundNumber: 'desc' },
          take: 1,
        },
      },
    })
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    
    if (hostToken && room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Invalid host token' }, { status: 401 })
    }
    
    return NextResponse.json(room)
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    )
  }
}