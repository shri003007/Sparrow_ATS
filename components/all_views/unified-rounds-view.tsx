"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, Eye, ChevronDown, Check } from "lucide-react"
import { JobRoundTemplatesApi } from "@/lib/api/rounds"
import { RoundStepper } from "@/components/round_details/round-stepper"
import { RoundContent } from "@/components/round_details/round-content"
import { MultiJobProvider } from "./multi-job-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { JobRoundTemplate } from "@/lib/round-types"

interface UnifiedRoundsViewProps {
  selectedJobs: JobOpeningListItem[]
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
  viewId?: string // Add viewId to detect view changes
  onBackToCandidates?: () => void
}

// Enhanced JobRoundTemplate with job context
interface MultiJobRoundTemplate extends JobRoundTemplate {
  jobTitle: string
  jobId: string
}

export function UnifiedRoundsView({ 
  selectedJobs, 
  onNavigationCheck,
  viewId,
  onBackToCandidates
}: UnifiedRoundsViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  // State for unified rounds from all jobs
  const [allRounds, setAllRounds] = useState<MultiJobRoundTemplate[]>([])
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [currentRound, setCurrentRound] = useState<MultiJobRoundTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ completed: 0, total: 0 })
  const currentLoadingSession = useRef<number | null>(null)
  
  // No need for caching here - caching is handled at the API level

  // Job filtering state - all jobs selected by default
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())

  // Initialize selected jobs when selectedJobs changes
  useEffect(() => {
    if (selectedJobs.length > 0) {
      setSelectedJobIds(new Set(selectedJobs.map(job => job.id)))
    }
  }, [selectedJobs])


  // Fetch all rounds from all jobs and create unified list
  useEffect(() => {
    console.log(`🎯 [COMPONENT] UnifiedRoundsView - useEffect triggered for ${selectedJobs.length} jobs, viewId: ${viewId}`)
    
    const fetchAllJobsRounds = async () => {
      if (selectedJobs.length === 0) {
        console.log(`🎯 [COMPONENT] UnifiedRoundsView - No jobs selected, skipping fetch`)
        return
      }

      console.log(`🎯 [COMPONENT] UnifiedRoundsView - Starting fetch for jobs:`, selectedJobs.map(j => `${j.posting_title} (${j.id})`))

      // Cancel any previous loading session
      const loadingSessionId = Date.now()
      currentLoadingSession.current = loadingSessionId

      // Reset loading state for this session
      setIsLoading(true)
      setLoadingProgress({ completed: 0, total: selectedJobs.length })
      setAllRounds([])
      setCurrentRound(null)
      setCurrentRoundIndex(0)

      const allJobRounds: MultiJobRoundTemplate[] = []

      try {
        // Process all jobs in parallel for better performance
        console.log('Fetching rounds from API in parallel for jobs:', selectedJobs.map(j => j.posting_title))
        const startTime = performance.now()
        
        const jobPromises = selectedJobs.map(async (job) => {
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

            // Update progress as each job completes
            setLoadingProgress(prev => {
              if (currentLoadingSession.current === loadingSessionId) {
                return { ...prev, completed: prev.completed + 1 }
              }
              return prev // Don't update if session changed
            })

            return {
              job,
              rounds: jobRoundsWithContext,
              success: true
            }
          } catch (error) {
            console.error(`Failed to fetch rounds for job "${job.posting_title}":`, error)
            
            // Update progress even on error
            setLoadingProgress(prev => {
              if (currentLoadingSession.current === loadingSessionId) {
                return { ...prev, completed: prev.completed + 1 }
              }
              return prev // Don't update if session changed
            })

            return {
              job,
              rounds: [],
              success: false,
              error
            }
          }
        })

        // Wait for all jobs to complete
        const jobResults = await Promise.all(jobPromises)
        const endTime = performance.now()
        console.log(`Parallel job rounds fetch completed in ${Math.round(endTime - startTime)}ms for ${selectedJobs.length} jobs`)

        // Check if this loading session is still current after all requests complete
        if (currentLoadingSession.current !== loadingSessionId) {
          console.log('Loading session cancelled after parallel fetch completion')
          return // Exit if a newer loading session has started
        }

        // Aggregate results from all jobs
        for (const jobResult of jobResults) {
          if (jobResult.success) {
            allJobRounds.push(...jobResult.rounds)
          }
        }

        // Keep all rounds (don't group by type) to preserve job associations
        // The round content components will handle aggregating candidates from multiple jobs
        
        // Only process results if this session is still current
        if (currentLoadingSession.current === loadingSessionId) {
          // Sort rounds by order_index to maintain proper sequence
          const sortedRounds = allJobRounds.sort((a, b) => a.order_index - b.order_index)
          setAllRounds(sortedRounds)

          console.log(`Loaded ${sortedRounds.length} rounds from ${selectedJobs.length} jobs`)
        }
      } catch (error) {
        console.error('Failed to fetch rounds for all jobs:', error)
      } finally {
        // Only update loading state if this is still the current loading session
        if (currentLoadingSession.current === loadingSessionId) {
          setIsLoading(false)
        }
      }
    }

    fetchAllJobsRounds()
  }, [selectedJobs])

  // Track previous viewId to detect actual view changes
  const previousViewIdRef = useRef<string | null>(null)
  
  // Clear cache only when truly switching views (not during development/HMR)
  useEffect(() => {
    // Only clear cache when viewId actually changes (not on initial mount or HMR)
    if (previousViewIdRef.current && previousViewIdRef.current !== viewId) {
      console.log('🧹 [CACHE CLEANUP] View changed, clearing stale caches')
      
      // Clear caches only when switching between different views
      if (typeof localStorage !== 'undefined') {
        try {
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.includes('ats_job_round_templates_cache') || 
                key.includes('ats_round_candidates_cache') || 
                key.includes('ats_sparrow_assessment_mapping_cache')) {
              localStorage.removeItem(key)
            }
          })
        } catch (error) {
          console.warn('Cache cleanup failed:', error)
        }
      }
    }
    
    previousViewIdRef.current = viewId || null
  }, [viewId])


  // Set current round when rounds are loaded
  useEffect(() => {
    if (allRounds.length > 0 && !currentRound) {
      setCurrentRound(allRounds[0])
      setCurrentRoundIndex(0)
    }
  }, [allRounds, currentRound])

  // Reset current round if it's filtered out
  useEffect(() => {
    if (allRounds.length === 0) return // Don't do anything if no rounds loaded yet
    
    const filteredRounds = allRounds.filter(round => selectedJobIds.has(round.jobId))
    
    // Create unique rounds for navigation
    const uniqueRoundsMap = new Map<string, MultiJobRoundTemplate>()
    filteredRounds.forEach(round => {
      const key = `${round.round_type}_${round.round_name}`
      if (!uniqueRoundsMap.has(key)) {
        uniqueRoundsMap.set(key, round)
      }
    })
    const uniqueFilteredRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.order_index - b.order_index)
    
    if (uniqueFilteredRounds.length > 0) {
      // If current round is filtered out or doesn't exist, set to first filtered round
      if (!currentRound || !selectedJobIds.has(currentRound.jobId)) {
        console.log('Setting current round to first filtered round:', uniqueFilteredRounds[0]?.round_name)
        setCurrentRound(uniqueFilteredRounds[0])
        setCurrentRoundIndex(0)
      } else {
        // Check if current round type still exists in filtered rounds
        const currentRoundKey = `${currentRound.round_type}_${currentRound.round_name}`
        const currentRoundStillExists = uniqueFilteredRounds.some(round => 
          `${round.round_type}_${round.round_name}` === currentRoundKey
        )
        if (currentRoundStillExists) {
          // Update index to match position in unique filtered array
          const filteredIndex = uniqueFilteredRounds.findIndex(round => 
            `${round.round_type}_${round.round_name}` === currentRoundKey
          )
          if (filteredIndex !== -1) {
            setCurrentRoundIndex(filteredIndex)
            // Update current round to match the filtered one (might be from different job)
            setCurrentRound(uniqueFilteredRounds[filteredIndex])
          }
        } else {
          // Current round type no longer exists in filtered jobs, switch to first available
          console.log('Current round type no longer exists in filtered jobs, switching to:', uniqueFilteredRounds[0]?.round_name)
          setCurrentRound(uniqueFilteredRounds[0])
          setCurrentRoundIndex(0)
        }
      }
    } else {
      // No filtered rounds available, clear current round only if no jobs are selected
      if (selectedJobIds.size === 0) {
        console.log('No jobs selected, clearing current round')
        setCurrentRound(null)
        setCurrentRoundIndex(0)
      } else {
        console.log('No rounds available for selected jobs, but keeping UI active')
        setCurrentRound(null)
        setCurrentRoundIndex(0)
      }
    }
  }, [selectedJobIds, allRounds])

  // Debug logging (only when data changes, not on every render)
  useEffect(() => {
    if (allRounds.length > 0) {
      console.log('🔍 [FILTER DEBUG] UnifiedRoundsView filter state:', {
        allRoundsCount: allRounds.length,
        selectedJobIdsCount: selectedJobIds.size,
        currentRoundId: currentRound?.id
      })
    }
  }, [allRounds.length, selectedJobIds.size, currentRound?.id])

  // Navigation handlers (similar to RoundDetailsView)
  const handleStepClick = (index: number) => {
    const filteredRounds = allRounds.filter(round => selectedJobIds.has(round.jobId))
    const uniqueRoundsMap = new Map<string, MultiJobRoundTemplate>()
    filteredRounds.forEach(round => {
      const key = `${round.round_type}_${round.round_name}`
      if (!uniqueRoundsMap.has(key)) {
        uniqueRoundsMap.set(key, round)
      }
    })
    const uniqueRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.order_index - b.order_index)
    
    if (index >= 0 && index < uniqueRounds.length) {
      setCurrentRoundIndex(index)
      setCurrentRound(uniqueRounds[index])
    }
  }

  const handlePreviousStep = () => {
    if (currentRoundIndex > 0) {
      handleStepClick(currentRoundIndex - 1)
    }
  }

  const handleNextStep = () => {
    const filteredRounds = allRounds.filter(round => selectedJobIds.has(round.jobId))
    const uniqueRoundsMap = new Map<string, MultiJobRoundTemplate>()
    filteredRounds.forEach(round => {
      const key = `${round.round_type}_${round.round_name}`
      if (!uniqueRoundsMap.has(key)) {
        uniqueRoundsMap.set(key, round)
      }
    })
    const uniqueRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.order_index - b.order_index)
    
    if (currentRoundIndex < uniqueRounds.length - 1) {
      handleStepClick(currentRoundIndex + 1)
    }
  }

  const handleBackToCandidates = () => {
    if (onBackToCandidates) {
      onBackToCandidates()
    }
  }

  // Job filter handlers
  const handleJobToggle = useCallback((jobId: string, checked: boolean) => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(jobId)
      } else {
        newSet.delete(jobId)
      }
      return newSet
    })
  }, [])

  const handleSelectAllJobs = useCallback(() => {
    setSelectedJobIds(new Set(selectedJobs.map(job => job.id)))
  }, [selectedJobs])

  const handleDeselectAllJobs = useCallback(() => {
    setSelectedJobIds(new Set())
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-80 bg-gray-200 rounded-full h-3 mx-auto">
            <div
              className="bg-orange-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${loadingProgress.total > 0 ? (loadingProgress.completed / loadingProgress.total) * 100 : 0}%`
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3" style={{ fontFamily }}>
            {loadingProgress.completed} of {loadingProgress.total} jobs loaded
          </p>
        </div>
      </div>
    )
  }

  // Filter rounds by selected jobs first to check if any rounds are available
  const filteredRoundsForStepper = allRounds.filter(round => selectedJobIds.has(round.jobId))

  // Only show "No Rounds Found" if there are no rounds at all, not when filters result in empty
  if (allRounds.length === 0 && !isLoading) {
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

  // Create unique rounds for stepper (group by round type and name)
  const uniqueRoundsMap = new Map<string, MultiJobRoundTemplate>()
  filteredRoundsForStepper.forEach(round => {
    const key = `${round.round_type}_${round.round_name}`
    if (!uniqueRoundsMap.has(key)) {
      uniqueRoundsMap.set(key, round)
    }
  })
  const uniqueFilteredRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => a.order_index - b.order_index)

  // Convert unique filtered rounds back to JobRoundTemplate for the existing components
  const roundsForStepper: JobRoundTemplate[] = uniqueFilteredRounds.map(round => ({
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

  // Only show current round if its job is selected
  const currentRoundForContent = (currentRound && selectedJobIds.has(currentRound.jobId)) ? {
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
    <MultiJobProvider selectedJobs={selectedJobs} filteredJobIds={selectedJobIds}>
      <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
        {/* Job Filter Dropdown */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700" style={{ fontFamily }}>
              Filter by Jobs:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 min-w-[200px] justify-between"
                  style={{ fontFamily }}
                >
                  <span className="truncate">
                    {selectedJobIds.size === selectedJobs.length
                      ? 'All Jobs Selected'
                      : `${selectedJobIds.size} of ${selectedJobs.length} Jobs`}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px]">
                <div className="px-2 py-1.5 border-b">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllJobs}
                      className="h-7 px-2 text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllJobs}
                      className="h-7 px-2 text-xs"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {selectedJobs.map((job) => (
                    <DropdownMenuItem
                      key={job.id}
                      className="flex items-center gap-2 p-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing
                    >
                      <Checkbox
                        checked={selectedJobIds.has(job.id)}
                        onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
                        className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                      />
                      <span className="truncate text-sm" style={{ fontFamily }}>
                        {job.posting_title}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Show message when no jobs are selected, but still show the interface */}
        {filteredRoundsForStepper.length === 0 && selectedJobIds.size === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                No Jobs Selected
              </h3>
              <p className="text-gray-500" style={{ fontFamily }}>
                Please select at least one job from the filter dropdown above to view rounds.
              </p>
            </div>
          </div>
        ) : filteredRoundsForStepper.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                No Rounds Found
              </h3>
              <p className="text-gray-500" style={{ fontFamily }}>
                No rounds found for the selected job{selectedJobIds.size !== 1 ? 's' : ''}.
                Try selecting different jobs from the filter dropdown.
              </p>
            </div>
          </div>
        ) : (
          <>
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
              key={currentRoundForContent?.id || 'no-round'}
              currentRound={currentRoundForContent}
              rounds={roundsForStepper}
              currentStepIndex={currentRoundIndex}
              onNextStep={handleNextStep}
              createdBy={selectedJobs[0]?.created_by || ''}
            />
          </>
        )}
      </div>
    </MultiJobProvider>
  )
}
