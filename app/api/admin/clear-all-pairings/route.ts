import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomCode } = body

    if (!roomCode) {
      return NextResponse.json({ error: 'Missing roomCode' }, { status: 400 })
    }

    // Get room
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Count devices before clearing
    const devicesCount = await prisma.device.count({
      where: { 
        roomId: room.id,
        teamId: { not: null }
      }
    })

    // Clear all team pairings for this room
    await prisma.device.updateMany({
      where: { roomId: room.id },
      data: { 
        teamId: null,
        lastSeenAt: new Date()
      }
    })

    console.log(`🧹 Admin cleared all device pairings for room ${roomCode} (${devicesCount} devices unpaired)`)

    return NextResponse.json({ 
      success: true,
      message: `Successfully unpaired ${devicesCount} device(s)`,
      unpairedCount: devicesCount
    })

  } catch (error) {
    console.error('Clear all pairings error:', error)
    return NextResponse.json({ 
      error: 'Failed to clear pairings' 
    }, { status: 500 })
  }
}

