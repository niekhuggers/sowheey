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
  
  console.log('🔢 SCORING CALCULATION:')
  console.log('Submission ranks:', submissionRanks)
  console.log('Community ranks:', communityRanks)
  
  submissionRanks.forEach((participantId, index) => {
    const inTop3 = communityRanks.includes(participantId)
    const exactMatch = communityRanks[index] === participantId
    
    console.log(`Position ${index + 1}: ${participantId}`)
    console.log(`  - In top 3? ${inTop3}`)
    console.log(`  - Exact match? ${exactMatch}`)
    
    if (inTop3) {
      score += 1
      console.log(`  - Added 1 pt (in top 3) → running total: ${score}`)
      
      if (exactMatch) {
        score += 2
        console.log(`  - Added 2 pt (exact match) → running total: ${score}`)
      }
    } else {
      console.log(`  - Not in top 3, no points`)
    }
  })
  
  console.log(`✅ FINAL SCORE: ${score} points`)
  return score
}