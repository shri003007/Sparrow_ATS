"use client"

import { ScreeningRoundContent } from "./screening-round-content"
import { InterviewRoundContent } from "./interview-round-content"
import { ProjectRoundContent } from "./project-round-content"
import type { JobRoundTemplate } from "@/lib/round-types"

interface RoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextStep: () => void
  createdBy?: string
}

export function RoundContent({ currentRound, rounds, currentStepIndex, onNextStep, createdBy }: RoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!currentRound) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-500 mb-2" style={{ fontFamily }}>
            No round selected
          </div>
          <div className="text-sm text-gray-400" style={{ fontFamily }}>
            Please select a round from the stepper above
          </div>
        </div>
      </div>
    )
  }

  // Render appropriate component based on round type
  if (currentRound.round_type === 'SCREENING') {
    return (
      <ScreeningRoundContent
        currentRound={currentRound}
        rounds={rounds}
        currentStepIndex={currentStepIndex}
        onNextRound={onNextStep}
        createdBy={createdBy || ''}
      />
    )
  } else if (currentRound.round_type === 'INTERVIEW') {
    return (
      <InterviewRoundContent
        currentRound={currentRound}
        rounds={rounds}
        currentStepIndex={currentStepIndex}
        onNextRound={onNextStep}
        createdBy={createdBy || ''}
      />
    )
  } else if (currentRound.round_type === 'PROJECT') {
    return (
      <ProjectRoundContent
        currentRound={currentRound}
        rounds={rounds}
        currentStepIndex={currentStepIndex}
        onNextRound={onNextStep}
        createdBy={createdBy || ''}
      />
    )
  }

  // Fallback for other round types
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-gray-500 mb-2" style={{ fontFamily }}>
          Round type "{currentRound.round_type}" not yet supported
        </div>
        <div className="text-sm text-gray-400" style={{ fontFamily }}>
          Please contact support for assistance.
        </div>
      </div>
    </div>
  )
}