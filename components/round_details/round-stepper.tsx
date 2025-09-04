"use client"

import React, { Fragment, useState } from "react"
import { Lock, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { NavButton } from "@/components/ui/nav-button"
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
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
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
      <div className="w-full px-6">
        {/* Single Line Layout: Back Button | Rounds | Navigation */}
        <div className="flex items-center justify-between w-full min-w-0">
          {/* Left: Back to Candidates */}
          <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
            <button
              onClick={onBackToCandidates}
              onMouseEnter={() => setHoveredButton('back')}
              onMouseLeave={() => setHoveredButton(null)}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-lg overflow-hidden"
              style={{
                backgroundColor: '#5BA4A4',
                fontSize: '14px',
                width: hoveredButton === 'back' ? 'auto' : '32px',
                minWidth: hoveredButton === 'back' ? 'auto' : '32px',
                paddingLeft: hoveredButton === 'back' ? '16px' : '8px',
                paddingRight: hoveredButton === 'back' ? '16px' : '8px'
              }}
            >
              {hoveredButton === 'back' ? (
                <>
                  <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Back to Candidates</span>
                </>
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Center: Rounds Stepper - Fixed Space with Scrolling */}
          <div className="flex-1 mx-4 relative min-w-0" style={{ maxWidth: 'calc(100% - 400px)' }}>
            <div 
              className="flex items-center justify-center overflow-x-auto scrollbar-hide py-2"
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                maxHeight: '80px'
              }}
            >
              <div className="flex items-center space-x-6 px-4 min-w-max mx-auto">
                {rounds.map((round, index) => {
                  const status = getStepStatus(round, index)
                  const isClickable = isStepClickable(round, index)
                  const isLast = index === rounds.length - 1

                  // Truncate long round names
                  const truncatedName = round.round_name.length > 12 
                    ? `${round.round_name.substring(0, 12)}...` 
                    : round.round_name

                  return (
                    <Fragment key={round.id}>
                      <div 
                        className={`flex flex-col items-center space-y-2 min-w-0 flex-shrink-0 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        onClick={() => isClickable && onStepClick(index)}
                        title={round.round_name} // Tooltip for full name
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
                            text-xs font-medium tracking-wide uppercase leading-tight text-center
                            w-20 truncate
                            ${status === 'completed' || status === 'active' ? 'text-[#5BA4A4]' : 'text-gray-400'}
                          `}
                          title={round.round_name}
                        >
                          {truncatedName}
                        </span>
                      </div>
                      
                      {!isLast && (
                        <div className="flex items-center flex-shrink-0">
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
            
            {/* Scroll fade indicators for many rounds */}
            {rounds.length > 5 && (
              <>
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
              </>
            )}
          </div>

          {/* Right: Navigation Controls */}
          <div className="flex-shrink-0 flex items-center gap-2" style={{ minWidth: '180px', justifyContent: 'flex-end' }}>
            <button
              onClick={onPreviousStep}
              disabled={!canGoPrevious || !isStepAvailable(previousRound)}
              onMouseEnter={() => !(!canGoPrevious || !isStepAvailable(previousRound)) && setHoveredButton('previous')}
              onMouseLeave={() => setHoveredButton(null)}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                backgroundColor: '#5BA4A4',
                fontSize: '14px',
                width: hoveredButton === 'previous' ? 'auto' : '32px',
                minWidth: hoveredButton === 'previous' ? 'auto' : '32px',
                paddingLeft: hoveredButton === 'previous' ? '12px' : '8px',
                paddingRight: hoveredButton === 'previous' ? '12px' : '8px'
              }}
            >
              {hoveredButton === 'previous' ? (
                <>
                  <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Previous</span>
                </>
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onNextStep}
              disabled={!canGoNext || !isStepAvailable(nextRound)}
              onMouseEnter={() => !(!canGoNext || !isStepAvailable(nextRound)) && setHoveredButton('next')}
              onMouseLeave={() => setHoveredButton(null)}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                backgroundColor: '#5BA4A4',
                fontSize: '14px',
                width: hoveredButton === 'next' ? 'auto' : '32px',
                minWidth: hoveredButton === 'next' ? 'auto' : '32px',
                paddingLeft: hoveredButton === 'next' ? '12px' : '8px',
                paddingRight: hoveredButton === 'next' ? '12px' : '8px'
              }}
            >
              {hoveredButton === 'next' ? (
                <>
                  <span className="whitespace-nowrap">Next</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </>
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}