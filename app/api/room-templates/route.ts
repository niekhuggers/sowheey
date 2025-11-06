import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  hostToken: z.string(),
  participants: z.array(z.object({
    name: z.string(),
    isHost: z.boolean(),
  })),
  isWeekendMode: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, hostToken, participants, isWeekendMode } = createTemplateSchema.parse(body)
    
    const template = await prisma.roomTemplate.create({
      data: {
        name,
        hostToken,
        participantsJson: JSON.stringify(participants),
        isWeekendMode,
      },
    })
    
    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating room template:', error)
    return NextResponse.json(
      { error: 'Failed to create room template' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const hostToken = searchParams.get('hostToken')
  
  if (!hostToken) {
    return NextResponse.json({ error: 'Host token required' }, { status: 400 })
  }
  
  try {
    const templates = await prisma.roomTemplate.findMany({
      where: { hostToken },
      orderBy: { updatedAt: 'desc' },
    })
    
    // Parse the JSON participants for each template
    const templatesWithParsedParticipants = templates.map(template => ({
      ...template,
      participants: JSON.parse(template.participantsJson),
    }))
    
    return NextResponse.json(templatesWithParsedParticipants)
  } catch (error) {
    console.error('Error fetching room templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room templates' },
      { status: 500 }
    )
  }
}