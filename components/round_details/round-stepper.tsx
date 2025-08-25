"use client"

import React, { Fragment } from "react"
import { Lock, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { JobRoundTemplate } from "@/lib/round-types"

interface RoundStepperProps {
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onStepClick: (stepIndex: number) => void
  onPreviousStep: () => void
  onNextStep: () => void
  onBackToCandidates: () => void
  hasAudioContent?: boolean // Whether current round has audio content
}

export function RoundStepper({ 
  rounds, 
  currentStepIndex, 
  onStepClick, 
  onPreviousStep, 
  onNextStep, 
  onBackToCandidates,
  hasAudioContent = false
}: RoundStepperProps) {
  const getStepStatus = (round: JobRoundTemplate, index: number) => {
    if (index < currentStepIndex) {
      return 'completed'
    } else if (index === currentStepIndex && round.is_active) {
      return 'active'
    } else if (round.is_active) {
      return 'pending'
    } else {
      return 'locked'
    }
  }

    const isStepClickable = (round: JobRoundTemplate, index: number) => {
    const status = getStepStatus(round, index)
    return status === 'completed' || status === 'active' || (status === 'pending' && round.is_active)
  }

  const canGoPrevious = currentStepIndex > 0
  const canGoNext = currentStepIndex < rounds.length - 1
  const currentRound = rounds[currentStepIndex]
  const previousRound = currentStepIndex > 0 ? rounds[currentStepIndex - 1] : null
  const nextRound = currentStepIndex < rounds.length - 1 ? rounds[currentStepIndex + 1] : null

  const isStepAvailable = (round: JobRoundTemplate | null) => {
    return round?.is_active || false
  }

  return (
    <div className="w-full bg-white py-4 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Back to Candidates */}
            <Button
              variant="outline"
              onClick={onBackToCandidates}
              className="flex items-center gap-2 text-sm"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Candidates
            </Button>

            {/* Current Round Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentRound?.round_name || "Round Details"}
                </h2>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* Previous Step */}
            <Button
              variant="outline"
              onClick={onPreviousStep}
              disabled={!canGoPrevious || !isStepAvailable(previousRound)}
              className="flex items-center gap-2 text-sm"
              style={{
                borderColor: canGoPrevious && isStepAvailable(previousRound) ? "#E5E7EB" : "#F3F4F6",
                color: canGoPrevious && isStepAvailable(previousRound) ? "#374151" : "#9CA3AF",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Step Counter */}
            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
              {currentStepIndex + 1} of {rounds.length}
            </div>

            {/* Next Step */}
            <Button
              variant="outline"
              onClick={onNextStep}
              disabled={!canGoNext || !isStepAvailable(nextRound)}
              className="flex items-center gap-2 text-sm"
              style={{
                borderColor: canGoNext && isStepAvailable(nextRound) ? "#E5E7EB" : "#F3F4F6",
                color: canGoNext && isStepAvailable(nextRound) ? "#374151" : "#9CA3AF",
              }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center space-x-10">
            {rounds.map((round, index) => {
              const status = getStepStatus(round, index)
              const isClickable = isStepClickable(round, index)
              const isLast = index === rounds.length - 1

              return (
                <Fragment key={round.id}>
                  <div 
                    className={`flex flex-col items-center space-y-2 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => isClickable && onStepClick(index)}
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 shadow-sm
                        ${status === 'completed' ? 'bg-[#5BA4A4] text-white shadow-md' : 
                          status === 'active' ? 'bg-[#5BA4A4] text-white shadow-md' : 
                          status === 'locked' ? 'bg-gray-50 text-gray-400 border border-gray-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}
                        ${isClickable ? 'hover:scale-110 hover:shadow-lg' : ''}
                      `}
                    >
                      {status === 'completed' ? '✓' : 
                       status === 'locked' ? <Lock className="w-3 h-3" /> : 
                       round.order_index}
                    </div>
                    
                    <span
                      className={`
                        text-xs font-medium tracking-wide uppercase leading-tight
                        ${status === 'completed' || status === 'active' ? 'text-[#5BA4A4]' : 'text-gray-400'}
                      `}
                    >
                      {round.round_name}
                    </span>
                  </div>
                  
                  {!isLast && (
                    <div className="flex items-center">
                      <span className="text-lg text-gray-300 font-extralight select-none">
                        ›
                      </span>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}