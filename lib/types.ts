export interface RoomState {
  room: {
    id: string
    name: string
    code: string
    isActive: boolean
    rosterLocked: boolean
    teamsLocked: boolean
    preEventLocked: boolean
  }
  participants: Participant[]
  devices: Device[]
  connectionCount: number
}

export interface Participant {
  id: string
  name: string
  avatarUrl?: string
  inviteToken: string
  isGuest: boolean
  createdAt: Date
}

export interface Device {
  id: string
  participantId?: string
  participant?: Participant
  teamId?: string
  team?: Team
  deviceToken: string
  lastSeenAt: Date
}

export interface Team {
  id: string
  name: string
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  teamId: string
  participantId: string
  participant?: Participant
}

export interface Question {
  id: string
  text: string
  category?: string
  type?: 'ranking' | 'fmk'
  fixedOptions?: string[]
  sortOrder: number
}

export interface Round {
  id: string
  questionId: string
  question?: Question
  roundNumber: number
  status: 'WAITING' | 'OPEN' | 'CLOSED' | 'REVEALED'
  communityRank1Id?: string
  communityRank2Id?: string
  communityRank3Id?: string
  completedAt?: Date
}

export interface Submission {
  id: string
  roundId: string
  participantId: string
  rank1Id: string
  rank2Id: string
  rank3Id: string
  submittedAt: Date
}

export interface PreSubmission {
  id: string
  participantId: string
  questionId: string
  rank1ParticipantId: string
  rank2ParticipantId: string
  rank3ParticipantId: string
  rank1Participant?: Participant
  rank2Participant?: Participant
  rank3Participant?: Participant
}

export interface Score {
  participantId: string
  points: number
  roundScore?: number
  totalScore?: number
}

export interface TeamScore {
  teamId: string
  team: Team
  totalScore: number
  rank: number
}