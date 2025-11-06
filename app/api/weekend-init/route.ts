import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PLAYERS = ['Tijn', 'Stijn', 'Tim', 'Maurits', 'Keith', 'Yanick', 'Rutger', 'Casper', 'Thijs', 'Sunny']
const HOSTS = ['Niek', 'Joep', 'Merijn']

const QUESTIONS = [
  'Wie gaan nooit trouwen?',
  'Wie heeft de minste ambitie?', 
  'Wie zegt het vaakst last minute af?',
  'Wie zijn gedoemd om irritante kinderen te krijgen?',
  'Wie belanden later in de gevangenis?',
  'Wie denken dat ze slim zijn, maar zijn het niet?',
  'Wie zijn het irritantst als ze dronken zijn?',
  'Wie verlaat altijd als laatste het huis?',
  'Wie heeft het grootste ego zonder reden?',
  'Wie gebruikt het meeste drugs?',
  'Wie zou stand-up comedian kunnen zijn?',
  'Wie trouwt met een veel jongere partner?',
  'Wie zou je peetoom van je kind maken?',
  'Wie poept het meest?',
  'Fuck, Marry, Kill: Aylin, Keone en Ceana'
]

const TEAMS = [
  { name: 'Team Chaos', members: ['Tijn', 'Stijn'] },
  { name: 'Team Wannabes', members: ['Tim', 'Maurits'] },
  { name: 'Team Alpha', members: ['Keith', 'Yanick'] },
  { name: 'Team Clowns', members: ['Rutger', 'Casper'] },
  { name: 'Team Vibes', members: ['Thijs', 'Sunny'] }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hostToken } = body

    // Verify admin access
    if (hostToken !== 'weekend2024-admin-token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if WEEKEND2024 room exists
    let room = await prisma.room.findUnique({
      where: { code: 'WEEKEND2024' },
      include: {
        participants: true,
        questions: true,
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    })

    // Create room if it doesn't exist
    if (!room) {
      console.log('Creating WEEKEND2024 room...')
      room = await prisma.room.create({
        data: {
          name: 'WEEKEND2024',
          code: 'WEEKEND2024',
          hostToken: 'weekend2024-admin-token',
          gameState: 'SETUP',
          currentRound: 0,
          totalRounds: QUESTIONS.length
        },
        include: {
          participants: true,
          questions: true,
          teams: {
            include: {
              members: {
                include: {
                  participant: true
                }
              }
            }
          }
        }
      })
    }

    const allPeople = [...PLAYERS, ...HOSTS]
    
    // Add participants if they don't exist
    if (room.participants.length === 0) {
      console.log('Adding participants...')
      for (const name of allPeople) {
        await prisma.participant.create({
          data: {
            roomId: room.id,
            name,
            avatarUrl: '',
            inviteToken: `${name.toLowerCase()}-invite-token`,
            isHost: HOSTS.includes(name)
          }
        })
      }
    }

    // Refresh room with participants
    room = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        participants: true,
        questions: true,
        teams: {
          include: {
            members: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    })!

    // Add questions if they don't exist
    if (room && room.questions.length === 0) {
      console.log('Adding questions...')
      for (let i = 0; i < QUESTIONS.length; i++) {
        await prisma.question.create({
          data: {
            roomId: room.id,
            text: QUESTIONS[i],
            sortOrder: i + 1
          }
        })
      }
    }

    // Add teams if they don't exist
    if (room && room.teams.length === 0) {
      console.log('Adding teams...')
      for (const teamData of TEAMS) {
        const team = await prisma.team.create({
          data: {
            roomId: room.id,
            name: teamData.name
          }
        })

        // Add team members
        for (const memberName of teamData.members) {
          const participant = room.participants.find(p => p.name === memberName)
          if (participant) {
            await prisma.teamMember.create({
              data: {
                teamId: team.id,
                participantId: participant.id
              }
            })
          }
        }
      }
    }

    console.log('WEEKEND2024 room initialization complete')

    return NextResponse.json({ 
      success: true, 
      message: 'WEEKEND2024 room initialized successfully',
      roomId: room?.id || 'unknown',
      participantCount: allPeople.length,
      questionCount: QUESTIONS.length,
      teamCount: TEAMS.length
    })

  } catch (error) {
    console.error('Weekend initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize weekend room', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}