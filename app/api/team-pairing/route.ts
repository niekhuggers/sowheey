import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, deviceToken, roomCode } = body

    if (!teamId || !deviceToken || !roomCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get room
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if team already has a device paired (excluding current device)
    const existingDevice = await prisma.device.findFirst({
      where: { 
        teamId: teamId,
        deviceToken: { not: deviceToken }
      }
    })

    if (existingDevice) {
      console.log(`Team ${teamId} already has device: ${existingDevice.deviceToken}`)
      return NextResponse.json({ 
        error: 'This team already has a player connected. Each team can only have one device.' 
      }, { status: 409 })
    }

    // Create or update device pairing
    const device = await prisma.device.upsert({
      where: { deviceToken },
      update: {
        teamId: teamId,
        participantId: null,
        lastSeenAt: new Date()
      },
      create: {
        roomId: room.id,
        teamId: teamId,
        deviceToken: deviceToken
      }
    })

    console.log(`Device ${deviceToken} successfully paired to team ${teamId}`)

    return NextResponse.json({ 
      success: true, 
      device: device
    })

  } catch (error) {
    console.error('Team pairing error:', error)
    return NextResponse.json({ 
      error: 'Failed to join team' 
    }, { status: 500 })
  }
}