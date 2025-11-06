import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): void {
  const socket = getSocket()
  if (!socket.connected) {
    socket.connect()
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function joinRoom(roomCode: string, deviceToken?: string): void {
  const socket = getSocket()
  socket.emit('join-room', { roomCode, deviceToken })
}

export function sendHostAction(
  roomCode: string,
  hostToken: string,
  action: string,
  payload: any
): void {
  const socket = getSocket()
  socket.emit('host-action', { roomCode, hostToken, action, payload })
}

export function submitRanking(
  roomCode: string,
  roundId: string,
  participantId: string,
  deviceToken: string,
  rankings: { rank1Id: string; rank2Id: string; rank3Id: string }
): void {
  const socket = getSocket()
  socket.emit('submit-ranking', {
    roomCode,
    roundId,
    participantId,
    deviceToken,
    rankings,
  })
}

export function submitTeamRanking(
  roomCode: string,
  roundId: string,
  teamId: string,
  deviceToken: string,
  rankings: { rank1Id: string; rank2Id: string; rank3Id: string }
): void {
  const socket = getSocket()
  socket.emit('submit-ranking', {
    roomCode,
    roundId,
    teamId,
    deviceToken,
    rankings,
  })
}

export function pairDevice(
  roomCode: string,
  deviceToken: string,
  options: { pairingCode?: string; participantId?: string }
): void {
  const socket = getSocket()
  socket.emit('pair-device', {
    roomCode,
    deviceToken,
    ...options,
  })
}