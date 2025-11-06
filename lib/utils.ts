import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generateInviteToken(): string {
  return crypto.randomUUID()
}

export function generateDeviceToken(): string {
  return crypto.randomUUID()
}

export function calculatePositionScores(submissions: Array<{
  rank1Id: string
  rank2Id: string
  rank3Id: string
}>): Map<string, number> {
  const scores = new Map<string, number>()
  
  submissions.forEach((submission) => {
    scores.set(submission.rank1Id, (scores.get(submission.rank1Id) || 0) + 3)
    scores.set(submission.rank2Id, (scores.get(submission.rank2Id) || 0) + 2)
    scores.set(submission.rank3Id, (scores.get(submission.rank3Id) || 0) + 1)
  })
  
  return scores
}

export function determineTop3(scores: Map<string, number>): {
  rank1Id: string | null
  rank2Id: string | null
  rank3Id: string | null
} {
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  
  return {
    rank1Id: sorted[0]?.[0] || null,
    rank2Id: sorted[1]?.[0] || null,
    rank3Id: sorted[2]?.[0] || null,
  }
}

export function calculateParticipantScore(
  submission: { rank1Id: string; rank2Id: string; rank3Id: string },
  communityTop3: { rank1Id: string | null; rank2Id: string | null; rank3Id: string | null }
): number {
  let score = 0
  
  const submissionRanks = [submission.rank1Id, submission.rank2Id, submission.rank3Id]
  const communityRanks = [communityTop3.rank1Id, communityTop3.rank2Id, communityTop3.rank3Id]
  
  submissionRanks.forEach((participantId, index) => {
    if (communityRanks.includes(participantId)) {
      score += 1
      
      if (communityRanks[index] === participantId) {
        score += 2
      }
    }
  })
  
  return score
}