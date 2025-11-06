import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // Run prisma db push to create all tables in Neon database
    console.log('Running prisma db push...')
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss')
    
    console.log('Prisma db push stdout:', stdout)
    if (stderr) {
      console.log('Prisma db push stderr:', stderr)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Schema pushed to database successfully!",
      output: stdout,
      warnings: stderr || null
    })
  } catch (error) {
    console.error('Schema push error:', error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to push schema",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}