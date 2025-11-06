'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Participant } from '@/lib/types'

interface MobileRankingProps {
  participants: Participant[]
  onRankingChange: (rankings: string[]) => void
  rankings: string[]
  question: {
    text: string
    type?: string
    fixedOptions?: string[]
  }
}

export function MobileRanking({ 
  participants, 
  onRankingChange, 
  rankings, 
  question 
}: MobileRankingProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [selectingPosition, setSelectingPosition] = useState<number | null>(null)

  const isSpecialQuestion = question.type === 'fmk'
  const availableOptions = isSpecialQuestion 
    ? question.fixedOptions || []
    : participants.map(p => p.id)

  const handlePositionSelect = (position: number) => {
    setSelectingPosition(position)
    setSelectedParticipant(null)
  }

  const handleParticipantSelect = (participantId: string) => {
    if (selectingPosition === null) return

    const newRankings = [...rankings]
    
    // Remove participant if already ranked
    const existingIndex = newRankings.indexOf(participantId)
    if (existingIndex !== -1) {
      newRankings[existingIndex] = ''
    }
    
    // Add to new position
    newRankings[selectingPosition] = participantId
    
    onRankingChange(newRankings.slice(0, 3))
    setSelectingPosition(null)
    setSelectedParticipant(null)
  }

  const getParticipantName = (id: string) => {
    if (isSpecialQuestion) {
      return id // For FMK, id is the name
    }
    return participants.find(p => p.id === id)?.name || id
  }

  const getAvailableParticipants = () => {
    if (isSpecialQuestion) {
      return availableOptions.filter(name => !rankings.includes(name))
    }
    return participants.filter(p => !rankings.includes(p.id))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">{question.text}</h3>
        {isSpecialQuestion && (
          <p className="text-sm text-gray-600 mb-4">
            Tap position → Select person
          </p>
        )}
      </div>

      {/* Ranking Positions */}
      <div className="space-y-3">
        {[0, 1, 2].map((position) => {
          const participantId = rankings[position]
          const labels = isSpecialQuestion 
            ? ['FUCK', 'MARRY', 'KILL']
            : ['1st Place', '2nd Place', '3rd Place']
          
          return (
            <div
              key={position}
              className={`border-2 rounded-lg p-4 min-h-[80px] flex items-center justify-between ${
                selectingPosition === position 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300'
              }`}
              onClick={() => handlePositionSelect(position)}
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700 min-w-[80px]">
                  {labels[position]}
                </div>
                {participantId ? (
                  <div className="flex items-center gap-2">
                    {!isSpecialQuestion && participants.find(p => p.id === participantId)?.avatarUrl ? (
                      <img
                        src={participants.find(p => p.id === participantId)?.avatarUrl}
                        alt={getParticipantName(participantId)}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                        {getParticipantName(participantId)[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium">{getParticipantName(participantId)}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">Tap to select</span>
                )}
              </div>
              
              {selectingPosition === position && (
                <div className="text-blue-600 text-sm">
                  ← Selecting
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Available Participants */}
      {selectingPosition !== null && (
        <div className="space-y-3">
          <h4 className="font-medium text-center">
            Select for {isSpecialQuestion 
              ? ['FUCK', 'MARRY', 'KILL'][selectingPosition]
              : `${selectingPosition + 1}${['st', 'nd', 'rd'][selectingPosition]} place`
            }:
          </h4>
          
          <div className="grid grid-cols-1 gap-2">
            {getAvailableParticipants().map((item) => {
              const id = isSpecialQuestion ? item as string : (item as any).id
              const name = isSpecialQuestion ? item as string : (item as any).name
              const avatar = isSpecialQuestion ? null : (item as any).avatarUrl
              
              return (
                <Button
                  key={id}
                  variant="secondary"
                  className="w-full h-12 justify-start"
                  onClick={() => handleParticipantSelect(id)}
                >
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span>{name}</span>
                  </div>
                </Button>
              )
            })}
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => setSelectingPosition(null)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}