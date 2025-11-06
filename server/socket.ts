import { createServer } from 'http'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const httpServer = createServer()

// Health check endpoint for Railway
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
  }
})

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://ranking-the-stars.vercel.app',
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean),
    methods: ['GET', 'POST']
  }
})

const roomConnections = new Map<string, Set<string>>()
const deviceSockets = new Map<string, string>()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-room', async (data: { roomCode: string; deviceToken?: string }) => {
    try {
      const room = await prisma.room.findUnique({
        where: { code: data.roomCode }
      })

      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      socket.join(data.roomCode)
      
      if (!roomConnections.has(data.roomCode)) {
        roomConnections.set(data.roomCode, new Set())
      }
      roomConnections.get(data.roomCode)!.add(socket.id)

      if (data.deviceToken) {
        deviceSockets.set(data.deviceToken, socket.id)
        
        await prisma.device.updateMany({
          where: { deviceToken: data.deviceToken },
          data: { lastSeenAt: new Date() }
        })
      }

      const participants = await prisma.participant.findMany({
        where: { roomId: room.id }
      })

      const devices = await prisma.device.findMany({
        where: { roomId: room.id },
        include: {
          participant: true,
          team: true
        }
      })

      io.to(data.roomCode).emit('room-state', {
        room,
        participants,
        devices,
        connectionCount: roomConnections.get(data.roomCode)?.size || 0
      })
    } catch (error) {
      console.error('Error joining room:', error)
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  socket.on('host-action', async (data: {
    roomCode: string;
    hostToken: string;
    action: string;
    payload: any;
  }) => {
    try {
      const room = await prisma.room.findUnique({
        where: { code: data.roomCode }
      })

      if (!room || room.hostToken !== data.hostToken) {
        socket.emit('error', { message: 'Unauthorized' })
        return
      }

      switch (data.action) {
        case 'add-participant':
          const participant = await prisma.participant.create({
            data: {
              roomId: room.id,
              name: data.payload.name,
              avatarUrl: data.payload.avatarUrl,
              inviteToken: crypto.randomUUID()
            }
          })
          io.to(data.roomCode).emit('participant-added', participant)
          break

        case 'update-participant':
          const updated = await prisma.participant.update({
            where: { id: data.payload.id },
            data: {
              name: data.payload.name,
              avatarUrl: data.payload.avatarUrl
            }
          })
          io.to(data.roomCode).emit('participant-updated', updated)
          break

        case 'delete-participant':
          await prisma.participant.delete({
            where: { id: data.payload.id }
          })
          io.to(data.roomCode).emit('participant-deleted', data.payload.id)
          break

        case 'lock-roster':
          await prisma.room.update({
            where: { id: room.id },
            data: { rosterLocked: data.payload.locked }
          })
          io.to(data.roomCode).emit('roster-locked', data.payload.locked)
          break

        case 'lock-pre-event':
          await prisma.room.update({
            where: { id: room.id },
            data: { preEventLocked: data.payload.locked }
          })
          io.to(data.roomCode).emit('pre-event-locked', data.payload.locked)
          break

        case 'generate-team-pairing-code':
          const existingCode = await prisma.teamPairingCode.findFirst({
            where: {
              teamId: data.payload.teamId,
              expiresAt: { gt: new Date() },
              used: false
            }
          })

          if (existingCode) {
            socket.emit('team-pairing-code', existingCode)
            return
          }

          const code = Math.random().toString(36).substring(2, 8).toUpperCase()
          const pairingCode = await prisma.teamPairingCode.create({
            data: {
              roomId: room.id,
              teamId: data.payload.teamId,
              code,
              expiresAt: new Date(Date.now() + 60 * 1000) // 1 minute
            }
          })
          socket.emit('team-pairing-code', pairingCode)
          break

        case 'start-round':
          const round = await prisma.round.create({
            data: {
              roomId: room.id,
              questionId: data.payload.questionId,
              roundNumber: data.payload.roundNumber,
              status: 'OPEN'
            }
          })
          io.to(data.roomCode).emit('round-started', round)
          break

        case 'close-round':
          const closedRound = await prisma.round.update({
            where: { id: data.payload.roundId },
            data: { status: 'CLOSED' }
          })
          io.to(data.roomCode).emit('round-closed', closedRound)
          break

        case 'reveal-round':
          const revealedRound = await prisma.round.update({
            where: { id: data.payload.roundId },
            data: { 
              status: 'REVEALED',
              communityRank1Id: data.payload.communityRank1Id,
              communityRank2Id: data.payload.communityRank2Id,
              communityRank3Id: data.payload.communityRank3Id,
              completedAt: new Date()
            }
          })
          io.to(data.roomCode).emit('round-revealed', revealedRound)
          break
      }
    } catch (error) {
      console.error('Host action error:', error)
      socket.emit('error', { message: 'Action failed' })
    }
  })

  socket.on('submit-ranking', async (data: {
    roomCode: string;
    roundId: string;
    participantId?: string;
    teamId?: string;
    deviceToken: string;
    rankings: {
      rank1Id: string;
      rank2Id: string;
      rank3Id: string;
    };
  }) => {
    try {
      const device = await prisma.device.findUnique({
        where: { deviceToken: data.deviceToken }
      })

      if (!device) {
        socket.emit('error', { message: 'Device not found' })
        return
      }

      // Validate device authorization - either individual participant or team
      const isAuthorizedIndividual = data.participantId && device.participantId === data.participantId
      const isAuthorizedTeam = data.teamId && device.teamId === data.teamId
      
      if (!isAuthorizedIndividual && !isAuthorizedTeam) {
        socket.emit('error', { message: 'Unauthorized device' })
        return
      }

      // For team submissions, create submission for each team member
      if (data.teamId && device.teamId) {
        const teamMembers = await prisma.teamMember.findMany({
          where: { teamId: data.teamId }
        })

        for (const member of teamMembers) {
          await prisma.submission.upsert({
            where: {
              roundId_participantId: {
                roundId: data.roundId,
                participantId: member.participantId
              }
            },
            update: {
              rank1Id: data.rankings.rank1Id,
              rank2Id: data.rankings.rank2Id,
              rank3Id: data.rankings.rank3Id,
              submittedAt: new Date()
            },
            create: {
              roundId: data.roundId,
              participantId: member.participantId,
              rank1Id: data.rankings.rank1Id,
              rank2Id: data.rankings.rank2Id,
              rank3Id: data.rankings.rank3Id
            }
          })
        }

        io.to(data.roomCode).emit('submission-received', {
          teamId: data.teamId,
          roundId: data.roundId
        })
      } else if (data.participantId) {
        // Individual participant submission
        const submission = await prisma.submission.upsert({
          where: {
            roundId_participantId: {
              roundId: data.roundId,
              participantId: data.participantId
            }
          },
          update: {
            rank1Id: data.rankings.rank1Id,
            rank2Id: data.rankings.rank2Id,
            rank3Id: data.rankings.rank3Id,
            submittedAt: new Date()
          },
          create: {
            roundId: data.roundId,
            participantId: data.participantId,
            rank1Id: data.rankings.rank1Id,
            rank2Id: data.rankings.rank2Id,
            rank3Id: data.rankings.rank3Id
          }
        })

        io.to(data.roomCode).emit('submission-received', {
          participantId: data.participantId,
          roundId: data.roundId
        })
      }
    } catch (error) {
      console.error('Submission error:', error)
      socket.emit('error', { message: 'Failed to submit ranking' })
    }
  })

  socket.on('pair-device', async (data: {
    roomCode: string;
    pairingCode?: string;
    participantId?: string;
    deviceToken: string;
  }) => {
    try {
      const room = await prisma.room.findUnique({
        where: { code: data.roomCode }
      })

      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      let device

      if (data.pairingCode) {
        const teamPairing = await prisma.teamPairingCode.findUnique({
          where: { code: data.pairingCode },
          include: { team: true }
        })

        if (!teamPairing || teamPairing.used || teamPairing.expiresAt < new Date()) {
          socket.emit('error', { message: 'Invalid or expired pairing code' })
          return
        }

        device = await prisma.device.upsert({
          where: { deviceToken: data.deviceToken },
          update: {
            teamId: teamPairing.teamId,
            participantId: null,
            lastSeenAt: new Date()
          },
          create: {
            roomId: room.id,
            teamId: teamPairing.teamId,
            deviceToken: data.deviceToken
          }
        })

        await prisma.teamPairingCode.update({
          where: { id: teamPairing.id },
          data: { used: true }
        })
      } else if (data.participantId) {
        device = await prisma.device.upsert({
          where: { deviceToken: data.deviceToken },
          update: {
            participantId: data.participantId,
            teamId: null,
            lastSeenAt: new Date()
          },
          create: {
            roomId: room.id,
            participantId: data.participantId,
            deviceToken: data.deviceToken
          }
        })
      }

      socket.emit('device-paired', device)
      io.to(data.roomCode).emit('devices-updated')
    } catch (error) {
      console.error('Device pairing error:', error)
      socket.emit('error', { message: 'Failed to pair device' })
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    
    roomConnections.forEach((sockets, roomCode) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          roomConnections.delete(roomCode)
        } else {
          io.to(roomCode).emit('connection-count', sockets.size)
        }
      }
    })

    deviceSockets.forEach((socketId, deviceToken) => {
      if (socketId === socket.id) {
        deviceSockets.delete(deviceToken)
      }
    })
  })
})

const PORT = Number(process.env.PORT) || Number(process.env.SOCKET_PORT) || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})