import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRoomCode } from '@/lib/utils'
import { defaultQuestions } from '@/lib/default-questions'
import { z } from 'zod'

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = createRoomSchema.parse(body)
    
    let code: string
    let attempts = 0
    
    do {
      code = generateRoomCode()
      const existing = await prisma.room.findUnique({ where: { code } })
      if (!existing) break
      attempts++
    } while (attempts < 10)
    
    const room = await prisma.room.create({
      data: {
        name,
        code,
        hostToken: crypto.randomUUID(),
      },
    })
    
    await prisma.question.createMany({
      data: defaultQuestions.map((q) => ({
        roomId: room.id,
        text: q.text,
        category: q.category,
        sortOrder: q.sortOrder,
      })),
    })
    
    return NextResponse.json(room)
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