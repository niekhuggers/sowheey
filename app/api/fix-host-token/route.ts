import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Find the WEEKEND2024 room
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' }
    })
    
    if (!room) {
      return NextResponse.json({ 
        success: false, 
        message: "WEEKEND2024 room not found" 
      }, { status: 404 })
    }
    
    // Update the host token to the fixed value
    const updatedRoom = await prisma.room.update({
      where: { code: 'WEEKEND2024' },
      data: { hostToken: 'weekend2024-admin-token' }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: "Host token updated successfully!",
      oldToken: room.hostToken,
      newToken: updatedRoom.hostToken
    })
  } catch (error) {
    console.error('Host token update error:', error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to update host token",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}