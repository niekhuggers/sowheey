import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const testResults = []
    
    testResults.push('🚀 Starting end-to-end game flow test...')
    
    // Step 1: Check if WEEKEND2024 room exists
    const room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        participants: true,
        teams: { include: { members: { include: { participant: true } } } },
        questions: { orderBy: { sortOrder: 'asc' } }
      }
    })
    
    if (!room) {
      return NextResponse.json({ error: 'WEEKEND2024 room not found' })
    }
    
    testResults.push(`✅ Room found: ${room.name} (${room.participants.length} participants, ${room.teams.length} teams)`)
    
    // Step 2: Simulate device joining and pairing to a team
    const testTeam = room.teams[0] // Use first team
    if (!testTeam) {
      return NextResponse.json({ error: 'No teams found in room' })
    }
    
    testResults.push(`📱 Simulating device pairing to team: ${testTeam.name}`)
    
    // Create a test device
    const testDeviceToken = `test-device-${Date.now()}`
    const device = await prisma.device.create({
      data: {
        roomId: room.id,
        teamId: testTeam.id,
        deviceToken: testDeviceToken
      }
    })
    
    testResults.push(`✅ Device created and paired to team`)
    
    // Step 3: Update room to LIVE_EVENT state
    await prisma.room.update({
      where: { id: room.id },
      data: {
        gameState: 'LIVE_EVENT',
        currentRound: 0
      }
    })
    
    testResults.push(`🎮 Room state updated to LIVE_EVENT`)
    
    // Step 4: Create a test round
    const testQuestion = room.questions[0]
    if (!testQuestion) {
      return NextResponse.json({ error: 'No questions found in room' })
    }
    
    // Find the next available round number
    const existingRounds = await prisma.round.findMany({
      where: { roomId: room.id },
      orderBy: { roundNumber: 'desc' }
    })
    
    const nextRoundNumber = (existingRounds[0]?.roundNumber || 0) + 1
    
    let round = await prisma.round.create({
      data: {
        roomId: room.id,
        questionId: testQuestion.id,
        roundNumber: nextRoundNumber,
        status: 'ACTIVE'
      }
    })
    
    testResults.push(`🎯 Round ${nextRoundNumber} started with question: "${testQuestion.text}"`)
    
    // Step 5: Simulate team submission
    const teamMembers = testTeam.members
    const availableParticipants = room.participants.filter(p => !['Niek', 'Joep', 'Merijn'].includes(p.name))
    
    if (availableParticipants.length < 3) {
      return NextResponse.json({ error: 'Not enough participants for ranking' })
    }
    
    const testRanking = {
      rank1Id: availableParticipants[0].id,
      rank2Id: availableParticipants[1].id,
      rank3Id: availableParticipants[2].id
    }
    
    testResults.push(`📝 Submitting test ranking: ${availableParticipants[0].name}, ${availableParticipants[1].name}, ${availableParticipants[2].name}`)
    
    // First, clean up any existing individual submissions for team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: testTeam.id }
    })
    
    for (const member of teamMembers) {
      await prisma.submission.deleteMany({
        where: {
          roundId: round.id,
          participantId: member.participantId
        }
      })
    }
    
    // Create single team submission
    await prisma.teamSubmission.create({
      data: {
        roundId: round.id,
        teamId: testTeam.id,
        rank1Id: testRanking.rank1Id,
        rank2Id: testRanking.rank2Id,
        rank3Id: testRanking.rank3Id
      }
    })
    
    testResults.push(`✅ Team submission created for ${testTeam.name} (cleaned up ${teamMembers.length} potential individual submissions)`)
    
    // Step 6: Close the round
    round = await prisma.round.update({
      where: { id: round.id },
      data: { status: 'CLOSED' }
    })
    
    testResults.push(`🔒 Round closed, ready for scoring`)
    
    // Step 7: Simulate scoring calculation
    testResults.push(`🧮 Calculating scores...`)
    
    const calculateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/rounds/${round.id}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken: room.hostToken })
    })
    
    if (!calculateResponse.ok) {
      testResults.push(`❌ Scoring calculation failed: ${calculateResponse.status}`)
      return NextResponse.json({ testResults, error: 'Scoring failed' })
    }
    
    const communityTop3 = await calculateResponse.json()
    testResults.push(`✅ Community ranking calculated`)
    testResults.push(`📊 Community ranking response:`, JSON.stringify(communityTop3))
    
    // Handle different response formats
    const top3Array = Array.isArray(communityTop3) ? communityTop3 : []
    if (top3Array.length > 0) {
      testResults.push(`🏆 Community Top 3: ${top3Array.map((p: any) => p.participantId || p.id || 'unknown').join(', ')}`)
    } else {
      testResults.push(`⚠️ No community ranking data returned`)
    }
    
    // Step 8: Reveal results
    await prisma.round.update({
      where: { id: round.id },
      data: { 
        status: 'REVEALED',
        communityRank1Id: top3Array[0]?.participantId || top3Array[0]?.id,
        communityRank2Id: top3Array[1]?.participantId || top3Array[1]?.id,
        communityRank3Id: top3Array[2]?.participantId || top3Array[2]?.id,
        completedAt: new Date()
      }
    })
    
    testResults.push(`🎊 Results revealed!`)
    
    // Step 9: Check team scores (direct team scoring, not individual)
    const teamScores = await prisma.teamScore.findMany({
      where: { roundId: round.id },
      include: { team: true },
      orderBy: { points: 'desc' }
    })
    
    testResults.push(`🏆 Team scores for Round ${nextRoundNumber}:`)
    teamScores.forEach(teamScore => {
      testResults.push(`   ${teamScore.team.name}: ${teamScore.points} points`)
    })
    
    // Step 10: Check individual scores for THIS specific round
    const individualScores = await prisma.score.findMany({
      where: { roundId: round.id },
      include: { participant: true }
    })
    
    testResults.push(`📊 Individual scores for Round ${nextRoundNumber}:`)
    if (individualScores.length > 0) {
      individualScores.forEach(score => {
        testResults.push(`   ${score.participant.name}: ${score.points} points`)
      })
    } else {
      testResults.push(`   No individual scores (pure team mode) ✅`)
    }
    
    // Cleanup: Remove test data
    await prisma.device.delete({ where: { id: device.id } })
    await prisma.teamSubmission.deleteMany({ where: { roundId: round.id } })
    await prisma.teamScore.deleteMany({ where: { roundId: round.id } })
    await prisma.score.deleteMany({ where: { roundId: round.id } })
    await prisma.round.delete({ where: { id: round.id } })
    testResults.push(`🧹 Test data cleaned up (round, submissions, scores)`)
    
    testResults.push(`✅ End-to-end test completed successfully!`)
    
    return NextResponse.json({ 
      success: true, 
      testResults,
      roundId: round.id,
      teamUsed: testTeam.name,
      teamScoresGenerated: teamScores.length,
      individualScoresGenerated: individualScores.length
    })
    
  } catch (error) {
    console.error('End-to-end test failed:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}