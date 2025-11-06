import { describe, it, expect } from 'vitest'
import { calculatePositionScores, determineTop3, calculateParticipantScore } from '@/lib/utils'

describe('Scoring Logic', () => {
  describe('calculatePositionScores', () => {
    it('should calculate position scores correctly', () => {
      const submissions = [
        { rank1Id: 'p1', rank2Id: 'p2', rank3Id: 'p3' },
        { rank1Id: 'p2', rank2Id: 'p1', rank3Id: 'p3' },
        { rank1Id: 'p1', rank2Id: 'p3', rank3Id: 'p2' },
      ]
      
      const scores = calculatePositionScores(submissions)
      
      expect(scores.get('p1')).toBe(7) // 3 + 2 + 3 = 8
      expect(scores.get('p2')).toBe(6) // 2 + 3 + 1 = 6
      expect(scores.get('p3')).toBe(5) // 1 + 1 + 2 = 4
    })
  })

  describe('determineTop3', () => {
    it('should determine top 3 from scores', () => {
      const scores = new Map([
        ['p1', 8],
        ['p2', 6],
        ['p3', 4],
        ['p4', 2],
      ])
      
      const top3 = determineTop3(scores)
      
      expect(top3.rank1Id).toBe('p1')
      expect(top3.rank2Id).toBe('p2')
      expect(top3.rank3Id).toBe('p3')
    })

    it('should handle ties alphabetically', () => {
      const scores = new Map([
        ['alice', 5],
        ['bob', 5],
        ['charlie', 3],
      ])
      
      const top3 = determineTop3(scores)
      
      expect(top3.rank1Id).toBe('alice') // alphabetically first
      expect(top3.rank2Id).toBe('bob')
      expect(top3.rank3Id).toBe('charlie')
    })
  })

  describe('calculateParticipantScore', () => {
    it('should award points for correct names in top 3', () => {
      const submission = {
        rank1Id: 'p1',
        rank2Id: 'p2',
        rank3Id: 'p3',
      }
      
      const communityTop3 = {
        rank1Id: 'p1',
        rank2Id: 'p3',
        rank3Id: 'p2',
      }
      
      // p1 in correct position: +1 for being in top3, +2 for correct position = 3
      // p2 in top3 but wrong position: +1 for being in top3 = 1
      // p3 in top3 but wrong position: +1 for being in top3 = 1
      // Total: 5
      
      const score = calculateParticipantScore(submission, communityTop3)
      expect(score).toBe(5)
    })

    it('should award zero points for completely wrong guesses', () => {
      const submission = {
        rank1Id: 'p1',
        rank2Id: 'p2',
        rank3Id: 'p3',
      }
      
      const communityTop3 = {
        rank1Id: 'p4',
        rank2Id: 'p5',
        rank3Id: 'p6',
      }
      
      const score = calculateParticipantScore(submission, communityTop3)
      expect(score).toBe(0)
    })
  })
})