import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceToken } = body

    if (!deviceToken) {
      return NextResponse.json({ error: 'Missing deviceToken' }, { status: 400 })
    }

    // Find device
    const device = await prisma.device.findUnique({
      where: { deviceToken },
      include: {
        team: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        },
        participant: true,
        room: true
      }
    })

    if (!device) {
      return NextResponse.json({ 
        error: 'Device not found',
        deviceToken 
      }, { status: 404 })
    }

    // Get submissions for this device's team
    const teamSubmissions = device.teamId ? await prisma.teamSubmission.findMany({
      where: { teamId: device.teamId },
      include: {
        round: {
          include: {
            question: true
          }
        }
      },
      orderBy: { round: { roundNumber: 'asc' } }
    }) : []

    // Get scores for this team
    const teamScores = device.teamId ? await prisma.teamScore.findMany({
      where: { teamId: device.teamId },
      include: {
        round: {
          include: {
            question: true
          }
        }
      },
      orderBy: { round: { roundNumber: 'asc' } }
    }) : []

    // Get all devices in this room
    const allDevices = await prisma.device.findMany({
      where: { roomId: device.roomId },
      include: {
        team: true,
        participant: true
      }
    })

    return NextResponse.json({
      yourDevice: {
        deviceToken: device.deviceToken,
        pairedToTeam: device.team?.name || 'Not paired to any team',
        teamId: device.teamId,
        teamMembers: device.team?.members.map(m => m.participant.name) || [],
        pairedToParticipant: device.participant?.name || 'None',
        lastSeen: device.lastSeenAt
      },
      teamSubmissions: teamSubmissions.map(ts => ({
        round: ts.round.roundNumber,
        question: ts.round.question.text,
        submittedAt: ts.submittedAt
      })),
      teamScores: teamScores.map(ts => ({
        round: ts.round.roundNumber,
        question: ts.round.question.text,
        points: ts.points,
        createdAt: ts.createdAt
      })),
      allDevicesInRoom: allDevices.map(d => ({
        deviceToken: d.deviceToken.substring(0, 8) + '...',
        team: d.team?.name || 'No team',
        participant: d.participant?.name || 'None',
        lastSeen: d.lastSeenAt
      }))
    })
  } catch (error: any) {
    console.error('Debug device error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

