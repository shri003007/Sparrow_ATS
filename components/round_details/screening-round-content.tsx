"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, RefreshCw } from "lucide-react"
import { ModernScreeningCandidatesTable } from "./modern-screening-candidates-table"
import { CompetencyMetricsModal } from "./competency-metrics-modal"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"

interface ScreeningRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

export function ScreeningRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: ScreeningRoundContentProps) {
  const { isMultiJobMode } = useMultiJobContextSafe()
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  type RoundStatus = 'selected' | 'rejected' | 'action_pending'
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, RoundStatus>>({})
  
  // Pagination states
  const [isLoadingMoreCandidates, setIsLoadingMoreCandidates] = useState(false)
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0)

  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  // Ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Clear previous data immediately to show loader
      setRoundData(null)
      setIsLoading(true)
      setError(null)

      try {
        const response = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal)
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) {
          return
        }
        
        setRoundData(response)
        
        // Update pagination states
        if (response.pagination) {
          setHasMoreCandidates(response.pagination.has_next)
          setCurrentPage(response.pagination.current_page)
          setTotalCandidatesCount(response.pagination.total_count)
        } else {
          // Legacy response without pagination
          setHasMoreCandidates(false)
          setCurrentPage(1)
          setTotalCandidatesCount(response.candidate_count || response.candidates?.length || 0)
        }
        
        // Initialize status maps from API response
        const initialOriginal: Record<string, RoundStatus> = {}
        const initialCurrent: Record<string, RoundStatus> = {}
        for (const c of response.candidates || []) {
          const status = (c.candidate_rounds?.[0]?.status || c.round_status || 'action_pending') as RoundStatus
          initialOriginal[c.id] = status
          initialCurrent[c.id] = status
        }
        setOriginalStatusById(initialOriginal)
        setCurrentStatusById(initialCurrent)
        setPendingChanges({})
      } catch (error: any) {
        // Don't show error for aborted requests (happens during navigation)
        if (error.name !== 'AbortError') {
          console.error('Error fetching round data:', error)
          setError(error instanceof Error ? error.message : 'Failed to load round data')
        }
      } finally {
        // Only set loading to false if request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchRoundData()
    
    // Cleanup function to cancel ongoing requests when component unmounts or round changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentRound?.id])

  // Function to load more candidates (next page)
  const handleLoadMoreCandidates = async () => {
    if (!currentRound?.id || isLoadingMoreCandidates || !hasMoreCandidates || isMultiJobMode) {
      return
    }

    setIsLoadingMoreCandidates(true)
    
    try {
      const nextPage = currentPage + 1
      const nextPageResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(
        currentRound.id,
        undefined, // no abort signal for load more
        false, // don't force refresh
        nextPage,
        100
      )

      if (nextPageResponse) {
        // Append new candidates to existing ones
        setRoundData(prevData => {
          if (!prevData) return nextPageResponse
          return {
            ...prevData,
            candidates: [...prevData.candidates, ...nextPageResponse.candidates]
          }
        })
        
        // Update pagination states
        if (nextPageResponse.pagination) {
          setHasMoreCandidates(nextPageResponse.pagination.has_next)
          setCurrentPage(nextPageResponse.pagination.current_page)
        }

        // Initialize status tracking for new candidates
        const newOriginalStatus: Record<string, RoundStatus> = {}
        const newCurrentStatus: Record<string, RoundStatus> = {}
        
        nextPageResponse.candidates.forEach(candidate => {
          const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
          newOriginalStatus[candidate.id] = status
          newCurrentStatus[candidate.id] = status
        })
        
        setOriginalStatusById(prev => ({ ...prev, ...newOriginalStatus }))
        setCurrentStatusById(prev => ({ ...prev, ...newCurrentStatus }))
      }
    } catch (error: any) {
      console.error('Error loading more candidates:', error)
      // Could add toast notification here if needed
    } finally {
      setIsLoadingMoreCandidates(false)
    }
  }

  const handleRefresh = async () => {
    if (!currentRound?.id) return

    console.log('🔄 [REFRESH] Refreshing screening round data for round:', currentRound.id)

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Clear cache to ensure fresh data
      console.log('🔄 [REFRESH] Clearing cache before refresh')
      RoundCandidatesApi.clearCache()
      
      // Clear previous data immediately to show loader
      setRoundData(null)
      setIsLoading(true)
      setError(null)
      // Reset pagination
      setCurrentPage(1)
      setHasMoreCandidates(false)
      setTotalCandidatesCount(0)

      console.log('🔄 [REFRESH] Calling API: getCandidatesByRoundTemplate with forceRefresh=true')
      const response = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal, true)
      
      // Check if request was aborted before updating state
      if (abortController.signal.aborted) {
        return
      }
      
      console.log('✅ [REFRESH] Data refreshed successfully, candidates count:', response.candidates?.length || 0)
      setRoundData(response)
      
      // Update pagination states
      if (response.pagination) {
        setHasMoreCandidates(response.pagination.has_next)
        setCurrentPage(response.pagination.current_page)
        setTotalCandidatesCount(response.pagination.total_count)
      } else {
        // Legacy response without pagination
        setHasMoreCandidates(false)
        setCurrentPage(1)
        setTotalCandidatesCount(response.candidate_count || response.candidates?.length || 0)
      }
      
      // Initialize status maps from API response
      const initialOriginal: Record<string, RoundStatus> = {}
      const initialCurrent: Record<string, RoundStatus> = {}
      for (const c of response.candidates || []) {
        const status = (c.candidate_rounds?.[0]?.status || c.round_status || 'action_pending') as RoundStatus
        initialOriginal[c.id] = status
        initialCurrent[c.id] = status
      }
      setOriginalStatusById(initialOriginal)
      setCurrentStatusById(initialCurrent)
      setPendingChanges({})
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name !== 'AbortError') {
        console.error('❌ [REFRESH] Failed to refresh round data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load round data')
      }
    } finally {
      // Only set loading to false if request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  // Track status changes from table interactions
  const handleStatusChangeFromTable = (candidateId: string, newStatus: RoundStatus) => {
    setCurrentStatusById(prev => ({ ...prev, [candidateId]: newStatus }))
    setPendingChanges(prev => {
      const original = originalStatusById[candidateId]
      const updated = { ...prev }
      if (original === newStatus) {
        delete updated[candidateId]
      } else {
        updated[candidateId] = newStatus
      }
      return updated
    })
  }

  const handleProgressToNextRound = async () => {
    if (!currentRound?.id || !roundData) return

    setIsProgressingCandidates(true)
    try {
      // 1) Fetch ALL candidates across all pages for the current round
      const allCandidatesResponse = await RoundCandidatesApi.getAllCandidatesByRoundTemplate(
        currentRound.id,
        undefined,
        (currentPage, totalPages, candidates) => {
          console.log(`Fetching candidates: page ${currentPage}/${totalPages}, total: ${candidates.length}`)
        }
      )

      const allCandidates = allCandidatesResponse.candidates

      // 2) Persist ALL statuses for CURRENT round (not just changed)
      const currentRoundUpdates = allCandidates.map(c => ({
        candidate_id: c.id,
        status: (currentStatusById[c.id] || 'action_pending') as RoundStatus,
      }))

      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: currentRoundUpdates,
      })

      // 3) Build full candidate list for the NEXT round using current statuses
      const allCandidateIds = allCandidates.map(c => c.id)

      // Find next round
      const nextRound = rounds[currentStepIndex + 1]
      if (!nextRound) {
        alert('No next round available.')
        return
      }

      // 4) Progress candidates to next round by updating per-round status for the NEXT round template
      // Use the exact same status as currently set in this (previous) round, for ALL candidates
      const candidate_updates = allCandidateIds.map(candidate_id => ({
        candidate_id,
        status: (currentStatusById[candidate_id] || 'action_pending') as 'selected' | 'rejected' | 'action_pending',
      }))

      const updateNext = await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: nextRound.id,
        candidate_updates
      })

      // Confirm/activate the next round template so the UI can navigate
      await JobRoundTemplatesApi.confirmJobRoundTemplate(nextRound.id)

      // Create/update candidate_rounds for the next round with ALL candidates and individual statuses
      await CandidateRoundsApi.bulkCreateCandidateRounds({
        job_round_template_id: nextRound.id,
        candidates: candidate_updates,
        created_by: createdBy || 'system'
      })

      // Navigate to next round immediately
      onNextRound()
      
    } catch (error) {
      console.error('Error progressing candidates:', error)
      alert('Failed to progress candidates to next round')
    } finally {
      setIsProgressingCandidates(false)
    }
  }

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

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2" style={{ fontFamily }}>
            Error Loading Round Data
          </h3>
          <p className="text-red-600 mb-4" style={{ fontFamily }}>
            {error}
          </p>
          <Button
            onClick={handleRefresh}
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
    )
  }

  const selectedCandidatesCount = roundData?.candidates.filter(candidate => {
    const current = currentStatusById[candidate.id]
    const original = originalStatusById[candidate.id]
    return current === 'selected' && current !== original
  }).length || 0

  const hasNextRound = currentStepIndex < rounds.length - 1
  const nextRound = hasNextRound ? rounds[currentStepIndex + 1] : null

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Round Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily }}>
                  {currentRound.round_name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span style={{ fontFamily }}>
                    Round {currentRound.order_index} of {rounds.length}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      fontFamily
                    }}
                  >
                    SCREENING
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: currentRound.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: currentRound.is_active ? '#16A34A' : '#DC2626',
                      fontFamily
                    }}
                  >
                    {currentRound.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {currentRound.is_required && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: '#FEF3C7',
                        color: '#D97706',
                        fontFamily
                      }}
                    >
                      Required
                    </span>
                  )}
                </div>
              </div>

              {/* Round Stats & Actions */}
              <div className="flex items-center gap-6">
                {roundData && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily }}>
                      {totalCandidatesCount}
                    </div>
                    <div className="text-sm text-gray-600" style={{ fontFamily }}>
                      Candidate{totalCandidatesCount !== 1 ? 's' : ''}
                      {roundData.candidates.length < totalCandidatesCount && (
                        <span className="text-xs text-gray-500 block">
                          Showing {roundData.candidates.length} of {totalCandidatesCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Radar Chart Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetricsModal(true)}
                  className="flex items-center gap-2"
                  disabled={!roundData?.candidates?.some(c => c.candidate_rounds?.[0]?.is_evaluation)}
                  style={{ fontFamily }}
                >
                  <Users className="w-4 h-4" />
                  Radar Chart
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="flex items-center gap-2"
                  disabled={isLoading}
                  style={{ fontFamily }}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

              </div>
            </div>
          </div>
        </div>

        {/* Modern Screening Candidates Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className={`overflow-y-auto ${isMultiJobMode ? 'max-h-[calc(100vh-450px)]' : 'max-h-[calc(100vh-350px)]'}`}>
            <ModernScreeningCandidatesTable
              candidates={roundData?.candidates || []}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChangeFromTable}
              onCandidateUpdated={(updatedCandidate) => {
                setRoundData(prevData => {
                  if (!prevData) return prevData
                  return {
                    ...prevData,
                    candidates: prevData.candidates.map(candidate => 
                      candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                    )
                  }
                })
              }}
            />
          </div>
          
          {/* Load More Candidates Button */}
          {hasMoreCandidates && !isMultiJobMode && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
              <Button
                onClick={handleLoadMoreCandidates}
                disabled={isLoadingMoreCandidates}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 mx-auto"
                style={{ fontFamily }}
              >
                {isLoadingMoreCandidates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Load {Math.min(100, totalCandidatesCount - (roundData?.candidates.length || 0))} more
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Competency Metrics Modal */}
        <CompetencyMetricsModal
          isOpen={showMetricsModal}
          onClose={() => setShowMetricsModal(false)}
          candidates={roundData?.candidates || []}
          roundInfo={roundData?.template_info}
        />
      </div>
    </div>
  )
}
