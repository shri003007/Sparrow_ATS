"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { JobOpeningListItem } from "@/lib/job-types"
import { JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import { RoundStepper } from "@/components/round_details/round-stepper"
import { RoundContent } from "@/components/round_details/round-content"

interface RoundDetailsViewProps {
  job: JobOpeningListItem | null
  onBackToCandidates: () => void
}

export function RoundDetailsView({ job, onBackToCandidates }: RoundDetailsViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  // State for round data
  const [rounds, setRounds] = useState<JobRoundTemplate[]>([])
  const [currentRound, setCurrentRound] = useState<JobRoundTemplate | null>(null)
  const [isLoadingRounds, setIsLoadingRounds] = useState(false)
  const [roundsError, setRoundsError] = useState<string | null>(null)
  
  // State for step navigation
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  
  // Constants for localStorage keys
  const CURRENT_ROUND_INDEX_KEY = 'ats_current_round_index'

  // Fetch round templates when component mounts or job changes
  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchRoundTemplates = async () => {
      if (!job?.id) return

      setIsLoadingRounds(true)
      setRoundsError(null)

      try {
        // Force refresh to get latest data (bypass cache)
        const response = await JobRoundTemplatesApi.getJobRoundTemplates(job.id, true)
        
        // Check if request was cancelled
        if (abortController.signal.aborted) {
          return
        }
        
        const sortedRounds = response.job_round_templates.sort((a, b) => a.order_index - b.order_index)
        setRounds(sortedRounds)
        
        // Try to restore saved round index first
        let initialStepIndex = 0
        let useSavedIndex = false
        
        try {
          const savedRoundIndex = localStorage.getItem(CURRENT_ROUND_INDEX_KEY)
          if (savedRoundIndex !== null) {
            const parsedIndex = parseInt(savedRoundIndex, 10)
            if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < sortedRounds.length) {
              initialStepIndex = parsedIndex
              setCurrentRound(sortedRounds[parsedIndex])
              useSavedIndex = true
              console.log(`Restored round index ${parsedIndex} from localStorage`)
            }
          }
        } catch (error) {
          console.warn('Failed to restore saved round index:', error)
        }
        
        // If no saved index or invalid saved index, find the current active round
        if (!useSavedIndex) {
          const activeRounds = sortedRounds.filter(round => round.is_active)
          
          if (activeRounds.length > 0) {
            // Get the highest active round
            const currentActiveRound = activeRounds.sort((a, b) => b.order_index - a.order_index)[0]
            initialStepIndex = sortedRounds.findIndex(round => round.id === currentActiveRound.id)
            setCurrentRound(currentActiveRound)
          } else {
            // If no rounds are active, start with the first round
            setCurrentRound(sortedRounds[0] || null)
          }
        }
        
        setCurrentStepIndex(Math.max(0, initialStepIndex))
      } catch (error) {
        // Don't show errors for cancelled requests
        if (abortController.signal.aborted) {
          return
        }
        
        console.error('Error fetching round templates:', error)
        
        // Check if this is a 404/500 error indicating the job might be deleted
        const errorMessage = error instanceof Error ? error.message : 'Failed to load round details'
        if (errorMessage.includes('500') || errorMessage.includes('404')) {
          console.warn('Job may have been deleted, clearing localStorage and attempting recovery')
          // Clear localStorage to prevent repeated errors
          try {
            localStorage.removeItem('ats_selected_job')
            localStorage.removeItem('ats_current_view')
            localStorage.removeItem('ats_current_round_index')
          } catch (storageError) {
            console.warn('Failed to clear localStorage:', storageError)
          }
          
          setRoundsError('This job may have been deleted or is no longer available. Please select another job from the sidebar.')
        } else {
          setRoundsError(errorMessage)
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingRounds(false)
        }
      }
    }

    fetchRoundTemplates()
    
    // Cleanup function to cancel request when job changes or component unmounts
    return () => {
      abortController.abort()
    }
  }, [job?.id])

  // Update current round when step index changes
  useEffect(() => {
    if (rounds.length > 0 && currentStepIndex >= 0 && currentStepIndex < rounds.length) {
      setCurrentRound(rounds[currentStepIndex])
    }
  }, [currentStepIndex, rounds])

  // Save current round index to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_ROUND_INDEX_KEY, currentStepIndex.toString())
    } catch (error) {
      console.warn('Failed to save current round index to localStorage:', error)
    }
  }, [currentStepIndex, CURRENT_ROUND_INDEX_KEY])

  // Navigation handlers
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < rounds.length) {
      const targetRound = rounds[stepIndex]
      // Only allow navigation to active rounds or completed rounds
      if (targetRound.is_active || stepIndex < currentStepIndex) {
        setCurrentStepIndex(stepIndex)
      }
    }
  }

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleNextStep = () => {
    if (currentStepIndex < rounds.length - 1) {
      const nextIndex = currentStepIndex + 1
      // Optimistically mark next round active and move forward
      setRounds(prev => {
        const updated = [...prev]
        if (updated[nextIndex]) {
          updated[nextIndex] = { ...updated[nextIndex], is_active: true }
        }
        return updated
      })
      setCurrentStepIndex(nextIndex)
    }
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-500" style={{ fontFamily }}>
            No job selected
          </h2>
          <p className="text-gray-400 mt-2" style={{ fontFamily }}>
            Please select a job to view round details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 overflow-hidden" style={{ marginLeft: 0 }}>
      {/* Loading State */}
      {isLoadingRounds ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2" style={{ fontFamily }}>
              Loading Round Details...
            </h2>
            <p className="text-gray-600" style={{ fontFamily }}>
              Fetching round information for {job.posting_title}
            </p>
          </div>
        </div>
      ) : roundsError ? (
        /* Error State */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-4" style={{ fontFamily }}>
              Error Loading Rounds
            </h2>
            <p className="text-red-600 mb-4" style={{ fontFamily }}>
              {roundsError}
            </p>
            <Button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#EF4444",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : rounds.length === 0 ? (
        /* No Rounds State */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-500 mb-2" style={{ fontFamily }}>
              No rounds configured
            </h2>
            <p className="text-gray-400" style={{ fontFamily }}>
              No recruitment rounds found for {job.posting_title}
            </p>
          </div>
        </div>
      ) : (
        /* Main Round Interface */
        <>
          {/* Round Stepper with Navigation */}
          <RoundStepper
            rounds={rounds}
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
            onPreviousStep={handlePreviousStep}
            onNextStep={handleNextStep}
            onBackToCandidates={onBackToCandidates}
            hasAudioContent={currentRound?.round_type === 'INTERVIEW'}
          />

          {/* Round Content */}
          <RoundContent
            currentRound={currentRound}
            rounds={rounds}
            currentStepIndex={currentStepIndex}
            onNextStep={handleNextStep}
            createdBy={job.created_by}
          />
        </>
      )}
    </div>
  )
}