"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Calendar, ChevronDown, RefreshCw } from "lucide-react"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse, RoundCandidate } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { ModernProjectCandidatesTable } from "./modern-project-candidates-table"
import { CandidateEvaluationPanel } from "./candidate-evaluation-panel"
import { CompetencyMetricsModal } from "./competency-metrics-modal"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"

type RoundStatus = 'selected' | 'rejected' | 'action_pending'

// Module-level cache that persists across component mount/unmount cycles
const projectRoundCache: Record<string, {
  roundData: RoundCandidateResponse
  localCandidates: RoundCandidate[]
  originalStatus: Record<string, RoundStatus>
  currentStatus: Record<string, RoundStatus>
  hasMoreCandidates: boolean
  currentPage: number
  totalCandidatesCount: number
  fetchTime: number | null
  pageCache: Record<number, {
    candidates: RoundCandidate[]
    originalStatus: Record<string, RoundStatus>
    currentStatus: Record<string, RoundStatus>
    pagination: any
  }>
}> = {}

const ROUND_STATUS_CONFIG = {
  selected: {
    label: 'Selected',
    color: '#10B981',
    bgColor: '#DCFCE7'
  },
  rejected: {
    label: 'Rejected', 
    color: '#EF4444',
    bgColor: '#FEE2E2'
  },
  action_pending: {
    label: 'On Hold',
    color: '#F59E0B', 
    bgColor: '#FEF3C7'
  }
} as const

interface ProjectRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy: string
}


export function ProjectRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: ProjectRoundContentProps) {
  const { isMultiJobMode } = useMultiJobContextSafe()
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>([])
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  
  // Pagination states
  const [isLoadingMoreCandidates, setIsLoadingMoreCandidates] = useState(false)
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0)
  const [fetchTime, setFetchTime] = useState<number | null>(null)
  
  // Cache for storing fetched pages
  const pageCacheRef = useRef<Record<number, {
    candidates: RoundCandidate[]
    originalStatus: Record<string, RoundStatus>
    currentStatus: Record<string, RoundStatus>
    pagination: any
  }>>({})
  
  // Use module-level cache instead of component-level ref to persist across unmounts
  // (fullPageCacheRef is replaced by projectRoundCache module variable)

  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  // Re-evaluation states for all candidates
  const [candidateReEvaluationStates, setCandidateReEvaluationStates] = useState<Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>>({})

  // Ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Clear caches intelligently when round changes
  useEffect(() => {
    if (currentRound?.id) {
      const cachedFullPage = projectRoundCache[currentRound.id]
      if (!cachedFullPage) {
        // New round, clear page cache
        pageCacheRef.current = {}
        setFetchTime(null)
      }
      // If cache exists, we'll restore pageCache from it
    }
  }, [currentRound?.id])

  // Fetch round data
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) {
        setIsLoading(false)
        return
      }

      // Check if we have cached data for this round (module-level cache)
      const cachedFullPage = projectRoundCache[currentRound.id]
      if (cachedFullPage) {
        console.log(`📦 Using module-level cache for round ${currentRound.id}`)
        setRoundData(cachedFullPage.roundData)
        setLocalCandidates(cachedFullPage.localCandidates)
        setOriginalStatusById(cachedFullPage.originalStatus)
        setCurrentStatusById(cachedFullPage.currentStatus)
        setHasMoreCandidates(cachedFullPage.hasMoreCandidates)
        setCurrentPage(cachedFullPage.currentPage)
        setTotalCandidatesCount(cachedFullPage.totalCandidatesCount)
        setFetchTime(cachedFullPage.fetchTime)
        // Restore page cache as well
        pageCacheRef.current = cachedFullPage.pageCache
        console.log(`📦 Restored ${Object.keys(cachedFullPage.pageCache).length} cached pages`)
        setIsLoading(false)
        return
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        // Clear previous data immediately to show loader
        setRoundData(null)
        setLocalCandidates([])
        setIsLoading(true)
        setError(null)
        
        const data = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal)
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) {
          return
        }
        
        setRoundData(data)
        setLocalCandidates(data.candidates || [])
        
        // Update pagination states
        if (data.pagination) {
          setHasMoreCandidates(data.pagination.has_next)
          setCurrentPage(data.pagination.current_page)
          setTotalCandidatesCount(data.pagination.total_count)
        } else {
          // Legacy response without pagination
          setHasMoreCandidates(false)
          setCurrentPage(1)
          setTotalCandidatesCount(data.candidate_count || data.candidates?.length || 0)
        }
        
        // Initialize status tracking (same pattern as INTERVIEW and SCREENING rounds)
        const initialOriginal: Record<string, RoundStatus> = {}
        const initialCurrent: Record<string, RoundStatus> = {}
        for (const candidate of data.candidates || []) {
          const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
          initialOriginal[candidate.id] = status
          initialCurrent[candidate.id] = status
        }
        setOriginalStatusById(initialOriginal)
        setCurrentStatusById(initialCurrent)
        
        // Cache the full page data including page cache (module-level)
        projectRoundCache[currentRound.id] = {
          roundData: data,
          localCandidates: data.candidates || [],
          originalStatus: initialOriginal,
          currentStatus: initialCurrent,
          hasMoreCandidates: data.pagination?.has_next || false,
          currentPage: data.pagination?.current_page || 1,
          totalCandidatesCount: data.pagination?.total_count || data.candidate_count || data.candidates?.length || 0,
          fetchTime: null,
          pageCache: { ...pageCacheRef.current }
        }
        
        console.log(`✅ Cached full page data for round ${currentRound.id}`)
      } catch (err: any) {
        // Don't show error for aborted requests (happens during navigation)
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch round data:', err)
          setError(err instanceof Error ? err.message : 'Failed to load round data')
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

  // Function to handle page navigation
  const handlePageChange = async (newPage: number) => {
    if (!currentRound?.id || isLoadingMoreCandidates || isMultiJobMode) {
      return
    }

    // Check if page is already cached
    const cachedPage = pageCacheRef.current[newPage]
    if (cachedPage) {
      console.log(`📦 Using cached data for page ${newPage}`)
      setLocalCandidates(cachedPage.candidates)
      setOriginalStatusById(cachedPage.originalStatus)
      setCurrentStatusById(cachedPage.currentStatus)
      setHasMoreCandidates(cachedPage.pagination.has_next)
      setCurrentPage(cachedPage.pagination.current_page)
      setTotalCandidatesCount(cachedPage.pagination.total_count)
      setFetchTime(0) // Instant from cache
      return
    }

    setIsLoadingMoreCandidates(true)
    const startTime = performance.now()
    
    try {
      const pageResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(
        currentRound.id,
        undefined, // no abort signal
        false, // don't force refresh
        newPage,
        100
      )

      if (pageResponse) {
        const endTime = performance.now()
        const fetchTimeMs = Math.round(endTime - startTime)
        setFetchTime(fetchTimeMs)
        
        // Replace candidates with new page data
        setLocalCandidates(pageResponse.candidates || [])
        
        // Update pagination states
        if (pageResponse.pagination) {
          setHasMoreCandidates(pageResponse.pagination.has_next)
          setCurrentPage(pageResponse.pagination.current_page)
          setTotalCandidatesCount(pageResponse.pagination.total_count)
        }

        // Initialize status tracking for new page candidates
        const newOriginalStatus: Record<string, RoundStatus> = {}
        const newCurrentStatus: Record<string, RoundStatus> = {}
        
        pageResponse.candidates.forEach(candidate => {
          const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
          newOriginalStatus[candidate.id] = status
          newCurrentStatus[candidate.id] = status
        })
        
        setOriginalStatusById(newOriginalStatus)
        setCurrentStatusById(newCurrentStatus)
        
        // Cache the page data
        pageCacheRef.current[newPage] = {
          candidates: pageResponse.candidates || [],
          originalStatus: newOriginalStatus,
          currentStatus: newCurrentStatus,
          pagination: {
            has_next: pageResponse.pagination?.has_next || false,
            total_count: pageResponse.pagination?.total_count || 0,
            current_page: pageResponse.pagination?.current_page || newPage
          }
        }
        
        // Update module-level cache with new page cache
        if (currentRound?.id && projectRoundCache[currentRound.id]) {
          projectRoundCache[currentRound.id].pageCache = { ...pageCacheRef.current }
          projectRoundCache[currentRound.id].currentPage = newPage
          projectRoundCache[currentRound.id].fetchTime = fetchTimeMs
        }
        
        console.log(`✅ Fetched and cached page ${newPage} in ${fetchTimeMs}ms`)
      }
    } catch (error: any) {
      console.error('Error changing page:', error)
      setFetchTime(null)
      // Could add toast notification here if needed
    } finally {
      setIsLoadingMoreCandidates(false)
    }
  }

  const handleRefresh = async () => {
    if (!currentRound?.id) return
    
    console.log('🔄 [REFRESH] Refreshing project round data for round:', currentRound.id)
    
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
      
      // Clear both page cache and module-level cache
      pageCacheRef.current = {}
      if (currentRound?.id) {
        delete projectRoundCache[currentRound.id]
      }
      setFetchTime(null)
      console.log('🔄 [REFRESH] Page cache and module-level cache cleared')
      
      // Clear previous data immediately to show loader
      setRoundData(null)
      setLocalCandidates([])
      setIsLoading(true)
      setError(null)
      // Reset pagination
      setCurrentPage(1)
      setHasMoreCandidates(false)
      setTotalCandidatesCount(0)
      
      console.log('🔄 [REFRESH] Calling API: getCandidatesByRoundTemplate with forceRefresh=true')
      const data = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal, true)
      
      // Check if request was aborted before updating state
      if (abortController.signal.aborted) {
        return
      }
      
      console.log('✅ [REFRESH] Data refreshed successfully, candidates count:', data.candidates?.length || 0)
      setRoundData(data)
      setLocalCandidates(data.candidates || [])
      
      // Update pagination states
      if (data.pagination) {
        setHasMoreCandidates(data.pagination.has_next)
        setCurrentPage(data.pagination.current_page)
        setTotalCandidatesCount(data.pagination.total_count)
      } else {
        // Legacy response without pagination
        setHasMoreCandidates(false)
        setCurrentPage(1)
        setTotalCandidatesCount(data.candidate_count || data.candidates?.length || 0)
      }
      
      // Initialize status tracking
      const initialOriginal: Record<string, RoundStatus> = {}
      const initialCurrent: Record<string, RoundStatus> = {}
      for (const candidate of data.candidates || []) {
        const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
        initialOriginal[candidate.id] = status
        initialCurrent[candidate.id] = status
      }
      setOriginalStatusById(initialOriginal)
      setCurrentStatusById(initialCurrent)
    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name !== 'AbortError') {
        console.error('❌ [REFRESH] Failed to refresh round data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load round data')
      }
    } finally {
      // Only set loading to false if request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    // Update local candidates state
    setLocalCandidates(prevCandidates =>
      prevCandidates.map(candidate => {
        if (candidate.id === candidateId) {
          const updatedCandidate = { ...candidate }
          if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
            updatedCandidate.candidate_rounds[0].status = newStatus
          } else {
            updatedCandidate.round_status = newStatus
          }
          return updatedCandidate
        }
        return candidate
      })
    )

    // Update status tracking (same pattern as INTERVIEW and SCREENING rounds)
    setCurrentStatusById(prev => ({ ...prev, [candidateId]: newStatus }))
    
  }

  // Handle re-evaluation state changes
  const handleReEvaluationStateChange = (candidateId: string, state: {
    isReEvaluating?: boolean
    reEvaluationError?: string | null
    showReEvaluationOptions?: boolean
  }) => {
    setCandidateReEvaluationStates(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        ...state
      }
    }))
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

      const nextRound = rounds[currentStepIndex + 1]
      if (!nextRound) {
        alert('No next round available.')
        return
      }

      // 4) Progress candidates to next round using the same status from the current round, for ALL candidates
      const candidate_updates = allCandidateIds.map(candidate_id => ({
        candidate_id,
        status: (currentStatusById[candidate_id] || 'action_pending') as 'selected' | 'rejected' | 'action_pending'
      }))

      await CandidateRoundsApi.updateCandidateRoundStatus({
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

  const nextRound = rounds[currentStepIndex + 1]
  const selectedCandidatesCount = localCandidates.filter(candidate => {
    const current = currentStatusById[candidate.id]
    const original = originalStatusById[candidate.id]
    return current === 'selected' && current !== original
  }).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-500" style={{ fontFamily }}>Loading project round data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4" style={{ fontFamily }}>{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!roundData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500" style={{ fontFamily }}>No round data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Round Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily }}>
                  {roundData.template_info?.round_name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span style={{ fontFamily }}>
                    Round {roundData.template_info?.order_index} of {rounds.length}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#F59E0B',
                      fontFamily
                    }}
                  >
                    PROJECT
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: currentRound?.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: currentRound?.is_active ? '#16A34A' : '#DC2626',
                      fontFamily
                    }}
                  >
                    {currentRound?.is_active ? 'Active' : 'Inactive'}
                  </span>
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
                      {localCandidates.length < totalCandidatesCount && (
                        <span className="text-xs text-gray-500 block">
                          Showing {localCandidates.length} of {totalCandidatesCount}
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

        {/* Modern Project Candidates Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className={`overflow-y-auto ${isMultiJobMode ? 'max-h-[calc(100vh-450px)]' : 'max-h-[calc(100vh-350px)]'}`}>
            <ModernProjectCandidatesTable
              candidates={localCandidates}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChange}
              onCandidateUpdated={(updatedCandidate) => {
                setLocalCandidates(prev => 
                  prev.map(candidate => 
                    candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                  )
                )
              }}
              sparrowRoundId=""
              currentRoundName={currentRound?.round_name || 'Project Round'}
              candidateReEvaluationStates={candidateReEvaluationStates}
              onReEvaluationStateChange={handleReEvaluationStateChange}
              currentPage={currentPage}
              totalPages={Math.ceil(totalCandidatesCount / 100)}
              hasNextPage={hasMoreCandidates}
              hasPrevPage={currentPage > 1}
              onPageChange={!isMultiJobMode ? handlePageChange : undefined}
              isLoadingPage={isLoadingMoreCandidates}
              fetchTime={fetchTime}
            />
          </div>
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
