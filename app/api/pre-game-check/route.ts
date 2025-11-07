import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    overallStatus: 'CHECKING',
    checks: [],
    errors: [],
    warnings: []
  }

  try {
    // CHECK 1: Room exists
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        },
        participants: true,
        questions: {
          orderBy: { sortOrder: 'asc' }
        },
        rounds: true
      }
    })

    if (!room) {
      results.overallStatus = 'FAILED'
      results.errors.push('❌ Room WEEKEND2024 not found')
      return NextResponse.json(results, { status: 500 })
    }

    results.checks.push({
      name: 'Room Configuration',
      status: '✅ PASS',
      details: {
        code: room.code,
        currentRound: room.currentRound,
        gameState: room.gameState
      }
    })

    // CHECK 2: Teams configured
    if (room.teams.length === 0) {
      results.errors.push('❌ No teams found - need to create teams')
    } else if (room.teams.length !== 5) {
      results.warnings.push(`⚠️ Expected 5 teams, found ${room.teams.length}`)
    }

    results.checks.push({
      name: 'Teams',
      status: room.teams.length >= 5 ? '✅ PASS' : '⚠️ WARN',
      details: {
        count: room.teams.length,
        teams: room.teams.map(t => ({
          name: t.name,
          members: t.members.map(m => m.participant.name)
        }))
      }
    })

    // CHECK 3: Participants
    const expectedParticipants = ['Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny', 'Niek', 'Joep', 'Merijn']
    const missingParticipants = expectedParticipants.filter(name => 
      !room.participants.some(p => p.name === name)
    )

    if (missingParticipants.length > 0) {
      results.errors.push(`❌ Missing participants: ${missingParticipants.join(', ')}`)
    }

    results.checks.push({
      name: 'Participants',
      status: missingParticipants.length === 0 ? '✅ PASS' : '❌ FAIL',
      details: {
        count: room.participants.length,
        expected: expectedParticipants.length,
        missing: missingParticipants
      }
    })

    // CHECK 4: Questions
    if (room.questions.length !== 15) {
      results.errors.push(`❌ Expected 15 questions, found ${room.questions.length}`)
    }

    results.checks.push({
      name: 'Questions',
      status: room.questions.length === 15 ? '✅ PASS' : '❌ FAIL',
      details: {
        count: room.questions.length,
        expected: 15
      }
    })

    // CHECK 5: Pre-submissions (community rankings)
    const preSubmissions = await prisma.preSubmission.count({
      where: { roomId: room.id }
    })

    const expectedPreSubmissions = expectedParticipants.length * 15 // 13 people x 15 questions = 195
    if (preSubmissions < 150) {
      results.warnings.push(`⚠️ Only ${preSubmissions} pre-submissions (expected ~${expectedPreSubmissions}). Some community rankings missing.`)
    }

    results.checks.push({
      name: 'Pre-Submissions (Community Rankings)',
      status: preSubmissions >= 150 ? '✅ PASS' : '⚠️ WARN',
      details: {
        count: preSubmissions,
        expected: expectedPreSubmissions,
        percentage: Math.round((preSubmissions / expectedPreSubmissions) * 100)
      }
    })

    // CHECK 6: Clean state (no leftover game data)
    const teamScores = await prisma.teamScore.count({
      where: { round: { roomId: room.id } }
    })

    const teamSubmissions = await prisma.teamSubmission.count({
      where: { round: { roomId: room.id } }
    })

    const teamAggregates = await prisma.teamAggregateScore.count({
      where: { round: { roomId: room.id } }
    })

    const revealedRounds = room.rounds.filter(r => r.status === 'REVEALED').length

    if (teamScores > 0 || teamSubmissions > 0 || teamAggregates > 0 || revealedRounds > 0) {
      results.warnings.push(`⚠️ Found leftover game data. Click "Reset Rounds Only" before starting.`)
    }

    results.checks.push({
      name: 'Clean State',
      status: (teamScores === 0 && teamSubmissions === 0 && teamAggregates === 0 && revealedRounds === 0) ? '✅ PASS' : '⚠️ WARN',
      details: {
        teamScores,
        teamSubmissions,
        teamAggregates,
        revealedRounds,
        currentRound: room.currentRound
      }
    })

    // CHECK 7: Device pairings (should be none before game)
    const pairedDevices = await prisma.device.count({
      where: { 
        roomId: room.id,
        teamId: { not: null }
      }
    })

    if (pairedDevices > 0) {
      results.warnings.push(`⚠️ ${pairedDevices} devices already paired. Click "Clear Pairings" before starting.`)
    }

    results.checks.push({
      name: 'Device Pairings',
      status: pairedDevices === 0 ? '✅ PASS' : '⚠️ WARN',
      details: {
        pairedDevices,
        recommendation: pairedDevices > 0 ? 'Click "Clear Pairings" in admin' : 'Ready for teams to join'
      }
    })

    // CHECK 8: Critical tables exist
    try {
      await prisma.$queryRaw`SELECT 1 FROM "TeamScore" LIMIT 1`
      results.checks.push({
        name: 'TeamScore Table',
        status: '✅ PASS',
        details: 'Table exists and accessible'
      })
    } catch (error: any) {
      results.errors.push('❌ TeamScore table does not exist - game will fail!')
      results.checks.push({
        name: 'TeamScore Table',
        status: '❌ FAIL',
        details: error.message
      })
    }

    // Final status
    const hasCriticalErrors = results.errors.length > 0
    const hasWarnings = results.warnings.length > 0

    results.overallStatus = hasCriticalErrors ? '❌ NOT READY' : 
                           hasWarnings ? '⚠️ NEEDS ATTENTION' : 
                           '✅ READY TO PLAY'

    results.summary = {
      totalChecks: results.checks.length,
      passed: results.checks.filter((c: any) => c.status === '✅ PASS').length,
      warnings: results.checks.filter((c: any) => c.status === '⚠️ WARN').length,
      failed: results.checks.filter((c: any) => c.status === '❌ FAIL').length
    }

    results.recommendation = hasCriticalErrors 
      ? '🚨 Fix critical errors before starting game!'
      : hasWarnings
      ? '⚠️ Address warnings for best experience'
      : '🎉 All systems go! Ready for game night!'

    return NextResponse.json(results, {
      status: hasCriticalErrors ? 500 : 200
    })

  } catch (error: any) {
    results.overallStatus = '❌ ERROR'
    results.errors.push(`System error: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}

