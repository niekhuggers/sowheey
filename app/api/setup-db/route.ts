import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and create tables if needed
    await prisma.$executeRaw`SELECT 1`
    
    // Try to query a table to see if schema exists
    try {
      await prisma.room.findFirst()
      return NextResponse.json({ 
        success: true, 
        message: "Database already set up and working!" 
      })
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        message: "Database connected but schema missing. Run: npx prisma db push",
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: "Database connection failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}