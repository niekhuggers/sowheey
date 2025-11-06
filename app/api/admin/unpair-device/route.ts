import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, roomCode } = body

    if (!teamId || !roomCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find all devices paired to this team
    const devices = await prisma.device.findMany({
      where: { teamId: teamId }
    })

    if (devices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No devices paired to this team' 
      })
    }

    // Unpair all devices from this team
    await prisma.device.updateMany({
      where: { teamId: teamId },
      data: { 
        teamId: null,
        lastSeenAt: new Date()
      }
    })

    console.log(`Admin unpaired ${devices.length} device(s) from team ${teamId}`)

    return NextResponse.json({ 
      success: true,
      message: `Successfully unpaired ${devices.length} device(s)`,
      unpairedCount: devices.length
    })

  } catch (error) {
    console.error('Admin unpair error:', error)
    return NextResponse.json({ 
      error: 'Failed to unpair devices' 
    }, { status: 500 })
  }
}

