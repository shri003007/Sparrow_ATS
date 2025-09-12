"use client"

import { useState, useEffect } from "react"
import { Loader2, Eye } from "lucide-react"
import { JobRoundTemplatesApi } from "@/lib/api/rounds"
import { RoundStepper } from "@/components/round_details/round-stepper"
import { RoundContent } from "@/components/round_details/round-content"
import { MultiJobProvider } from "./multi-job-context"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { JobRoundTemplate } from "@/lib/round-types"

interface UnifiedRoundsViewProps {
  selectedJobs: JobOpeningListItem[]
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
}

// Enhanced JobRoundTemplate with job context
interface MultiJobRoundTemplate extends JobRoundTemplate {
  jobTitle: string
  jobId: string
}

export function UnifiedRoundsView({ 
  selectedJobs, 
  onNavigationCheck 
}: UnifiedRoundsViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  // State for unified rounds from all jobs
  const [allRounds, setAllRounds] = useState<MultiJobRoundTemplate[]>([])
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [currentRound, setCurrentRound] = useState<MultiJobRoundTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ completed: 0, total: 0 })

  // Fetch all rounds from all jobs and create unified list
  useEffect(() => {
    const fetchAllJobsRounds = async () => {
      if (selectedJobs.length === 0) return

      setIsLoading(true)
      setLoadingProgress({ completed: 0, total: selectedJobs.length })
      setAllRounds([])
      setCurrentRound(null)
      setCurrentRoundIndex(0)

      const allJobRounds: MultiJobRoundTemplate[] = []

      try {
        for (const job of selectedJobs) {
          try {
            // Fetch round templates for this job
            const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
            const rounds = templatesResponse.job_round_templates || []
            
            // Add job context to each round
            const jobRoundsWithContext: MultiJobRoundTemplate[] = rounds.map(round => ({
              ...round,
              jobTitle: job.posting_title,
              jobId: job.id
            }))
            
            allJobRounds.push(...jobRoundsWithContext)
            setLoadingProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
          } catch (error) {
            console.error(`Failed to fetch rounds for job "${job.posting_title}":`, error)
            setLoadingProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
          }
        }

        // Group rounds by type and name, keeping only unique round types
        const roundTypeMap = new Map<string, MultiJobRoundTemplate>()
        
        allJobRounds.forEach(round => {
          const key = `${round.round_type}_${round.round_name}`
          
          if (!roundTypeMap.has(key)) {
            // First round of this type - use it as the template
            roundTypeMap.set(key, round)
          }
          // If we already have this round type, we'll aggregate candidates in the component
        })
        
        // Sort unique rounds by order_index to maintain proper sequence
        const uniqueRounds = Array.from(roundTypeMap.values()).sort((a, b) => a.order_index - b.order_index)
        setAllRounds(uniqueRounds)
        
        console.log(`Loaded ${uniqueRounds.length} unique round types from ${selectedJobs.length} jobs`)
      } catch (error) {
        console.error('Failed to fetch rounds for all jobs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllJobsRounds()
  }, [selectedJobs])

  // Set current round when rounds are loaded
  useEffect(() => {
    if (allRounds.length > 0 && !currentRound) {
      setCurrentRound(allRounds[0])
      setCurrentRoundIndex(0)
    }
  }, [allRounds, currentRound])

  // Navigation handlers (similar to RoundDetailsView)
  const handleStepClick = (index: number) => {
    if (index >= 0 && index < allRounds.length) {
      setCurrentRoundIndex(index)
      setCurrentRound(allRounds[index])
    }
  }

  const handlePreviousStep = () => {
    if (currentRoundIndex > 0) {
      handleStepClick(currentRoundIndex - 1)
    }
  }

  const handleNextStep = () => {
    if (currentRoundIndex < allRounds.length - 1) {
      handleStepClick(currentRoundIndex + 1)
    }
  }

  const handleBackToCandidates = () => {
    // This would navigate back to candidates view in the parent component
    // For now, we'll just log it
    console.log('Navigate back to candidates')
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
            Loading Rounds...
          </h3>
          <p className="text-gray-600 mb-4" style={{ fontFamily }}>
            Fetching round data from {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''}
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${loadingProgress.total > 0 ? (loadingProgress.completed / loadingProgress.total) * 100 : 0}%` 
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2" style={{ fontFamily }}>
            {loadingProgress.completed} of {loadingProgress.total} jobs loaded
          </p>
        </div>
      </div>
    )
  }

  if (allRounds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
            No Rounds Found
          </h3>
          <p className="text-gray-500" style={{ fontFamily }}>
            No rounds found across the selected {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    )
  }

  // Convert MultiJobRoundTemplate back to JobRoundTemplate for the existing components
  const roundsForStepper: JobRoundTemplate[] = allRounds.map(round => ({
    id: round.id,
    job_opening_id: round.job_opening_id,
    round_id: round.round_id,
    order_index: round.order_index,
    is_active: round.is_active,
    is_required: round.is_required,
    custom_evaluation_criteria: round.custom_evaluation_criteria,
    custom_competencies: round.custom_competencies,
    created_at: round.created_at,
    round_name: round.round_name,
    round_type: round.round_type
  }))

  const currentRoundForContent = currentRound ? {
    id: currentRound.id,
    job_opening_id: currentRound.job_opening_id,
    round_id: currentRound.round_id,
    order_index: currentRound.order_index,
    is_active: currentRound.is_active,
    is_required: currentRound.is_required,
    custom_evaluation_criteria: currentRound.custom_evaluation_criteria,
    custom_competencies: currentRound.custom_competencies,
    created_at: currentRound.created_at,
    round_name: currentRound.round_name,
    round_type: currentRound.round_type
  } : null

  return (
    <MultiJobProvider selectedJobs={selectedJobs}>
      <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {/* Use the existing RoundStepper component */}
        <RoundStepper 
          rounds={roundsForStepper}
          currentStepIndex={currentRoundIndex}
          onStepClick={handleStepClick}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onBackToCandidates={handleBackToCandidates}
          hasAudioContent={currentRound?.round_type === 'INTERVIEW'}
        />

        {/* Use the existing RoundContent component */}
        <RoundContent
          currentRound={currentRoundForContent}
          rounds={roundsForStepper}
          currentStepIndex={currentRoundIndex}
          onNextStep={handleNextStep}
          createdBy={selectedJobs[0]?.created_by || ''}
        />
      </div>
    </MultiJobProvider>
  )
}
