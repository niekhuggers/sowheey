import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Test if TeamScore table exists by trying to query it
    try {
      await prisma.$queryRaw`SELECT COUNT(*) FROM "TeamScore" LIMIT 1`
      return NextResponse.json({ 
        success: true,
        message: 'TeamScore table already exists',
        tableExists: true
      })
    } catch (tableError: any) {
      console.log('TeamScore table does not exist, creating it...')
      
      // Create the table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TeamScore" (
          "id" TEXT NOT NULL,
          "roundId" TEXT NOT NULL,
          "teamId" TEXT NOT NULL,
          "points" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TeamScore_pkey" PRIMARY KEY ("id")
        );
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "TeamScore_roundId_teamId_key" 
        ON "TeamScore"("roundId", "teamId");
      `)
      
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'TeamScore_roundId_fkey'
          ) THEN
            ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_roundId_fkey" 
              FOREIGN KEY ("roundId") REFERENCES "Round"("id") 
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `)
      
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'TeamScore_teamId_fkey'
          ) THEN
            ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_teamId_fkey" 
              FOREIGN KEY ("teamId") REFERENCES "Team"("id") 
              ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
        END $$;
      `)
      
      return NextResponse.json({ 
        success: true,
        message: 'TeamScore table created successfully',
        tableExists: false,
        created: true
      })
    }
  } catch (error: any) {
    console.error('Ensure TeamScore table error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

