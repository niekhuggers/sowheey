import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceToken } = body

    if (!deviceToken) {
      return NextResponse.json({ error: 'Missing deviceToken' }, { status: 400 })
    }

    // Find and update the device to unpair from team
    const device = await prisma.device.findUnique({
      where: { deviceToken }
    })

    if (!device) {
      // Device doesn't exist, nothing to unpair
      return NextResponse.json({ success: true, message: 'No device to unpair' })
    }

    // Clear the teamId to unpair
    await prisma.device.update({
      where: { deviceToken },
      data: {
        teamId: null,
        lastSeenAt: new Date()
      }
    })

    console.log(`Device ${deviceToken} unpaired from team ${device.teamId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left team'
    })

  } catch (error) {
    console.error('Unpair error:', error)
    return NextResponse.json({ 
      error: 'Failed to leave team' 
    }, { status: 500 })
  }
}

