import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const deleteParticipantSchema = z.object({
  hostToken: z.string(),
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { hostToken } = deleteParticipantSchema.parse(body)
    
    const participant = await prisma.participant.findUnique({
      where: { id: params.id },
      include: { room: true },
    })
    
    if (!participant || participant.room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (participant.room.rosterLocked) {
      return NextResponse.json({ error: 'Roster is locked' }, { status: 400 })
    }
    
    await prisma.participant.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json(
      { error: 'Failed to delete participant' },
      { status: 500 }
    )
  }
}

const updateParticipantSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().optional(),
  hostToken: z.string(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, avatarUrl, hostToken } = updateParticipantSchema.parse(body)
    
    const participant = await prisma.participant.findUnique({
      where: { id: params.id },
      include: { room: true },
    })
    
    if (!participant || participant.room.hostToken !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (participant.room.rosterLocked) {
      return NextResponse.json({ error: 'Roster is locked' }, { status: 400 })
    }
    
    const updated = await prisma.participant.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating participant:', error)
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    )
  }
}