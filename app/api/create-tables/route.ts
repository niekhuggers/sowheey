import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Execute the equivalent of "prisma db push" via Prisma
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Room" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL UNIQUE,
        "hostToken" TEXT NOT NULL UNIQUE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "rosterLocked" BOOLEAN NOT NULL DEFAULT false,
        "teamsLocked" BOOLEAN NOT NULL DEFAULT false,
        "preEventLocked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Participant" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "roomId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "avatarUrl" TEXT,
        "inviteToken" TEXT NOT NULL UNIQUE,
        "isGuest" BOOLEAN NOT NULL DEFAULT false,
        "isHost" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE,
        UNIQUE("roomId", "name")
      );
    `

    // Test that tables were created
    await prisma.room.findFirst()
    
    return NextResponse.json({ 
      success: true, 
      message: "Database tables created successfully!" 
    })
  } catch (error) {
    console.error('Table creation error:', error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to create tables",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}