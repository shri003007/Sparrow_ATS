"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Settings } from "lucide-react"
import { ModernGamesArenaCandidatesTable } from "./modern-games-arena-candidates-table"
import { RoundSettingsModal } from "./round-settings-modal"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { evaluateSalesCandidate, type SalesEvaluationRequest } from "@/lib/api/evaluation"
import { getSparrowAssessmentMapping, type SparrowAssessmentMappingResponse } from "@/lib/api/sparrow-assessment-mapping"
import { CompetencyMetricsModal } from "./competency-metrics-modal"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"

interface GamesArenaRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

export function GamesArenaRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: GamesArenaRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const { selectedJobs, isMultiJobMode } = useMultiJobContextSafe()
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  type RoundStatus = 'selected' | 'rejected' | 'action_pending'
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, RoundStatus>>({})
  
  // Sales assessment settings
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [sparrowAssessmentId, setSparrowAssessmentId] = useState<string>('')
  const [brandId, setBrandId] = useState<string>('surveysparrow')
  const [tempAssessmentId, setTempAssessmentId] = useState<string>('')
  const [tempBrandId, setTempBrandId] = useState<string>('surveysparrow')
  const [assessmentMapping, setAssessmentMapping] = useState<SparrowAssessmentMappingResponse | null>(null)
  
  // Bulk evaluation state
  const [isBulkEvaluating, setIsBulkEvaluating] = useState(false)
  const [bulkEvaluationProgress, setBulkEvaluationProgress] = useState({ completed: 0, total: 0 })
  const [bulkEvaluationError, setBulkEvaluationError] = useState<string | null>(null)
  
  // Bulk status update state
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<RoundStatus | ''>('')
  const [isBulkStatusUpdate, setIsBulkStatusUpdate] = useState(false)
  const [bulkStatusError, setBulkStatusError] = useState<string | null>(null)
  
  // Re-evaluation states for all candidates
  const [candidateReEvaluationStates, setCandidateReEvaluationStates] = useState<Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>>({})

  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  // Ref to track if data is currently being fetched to prevent duplicate calls
  const isLoadingRef = useRef(false)
  const currentRoundIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<number>(0)
  const isFirstRenderRef = useRef(true)

  // Helper function to fetch candidates from multiple jobs for the same round type
  const fetchMultiJobRoundData = async (roundType: string, roundName: string, abortSignal: AbortSignal) => {
    if (!isMultiJobMode || selectedJobs.length === 0) {
      return null
    }

    const allCandidates: any[] = []
    let templateInfo = null
    let customFieldDefinitions: any[] = []

    for (const job of selectedJobs) {
      try {
        // Get round templates for this job
        const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
        const matchingRounds = templatesResponse.job_round_templates?.filter(
          round => round.round_type === roundType && round.round_name === roundName
        ) || []

        // Fetch candidates for each matching round
        for (const round of matchingRounds) {
          try {
            const candidatesResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(round.id, abortSignal)
            
            if (candidatesResponse.candidates) {
              // Add job context to each candidate
              const candidatesWithJobInfo = candidatesResponse.candidates.map(candidate => ({
                ...candidate,
                jobTitle: job.posting_title,
                jobId: job.id
              }))
              allCandidates.push(...candidatesWithJobInfo)
            }

            // Use the first round's template info and custom fields
            if (!templateInfo && candidatesResponse.template_info) {
              templateInfo = candidatesResponse.template_info
            }
            if (customFieldDefinitions.length === 0 && candidatesResponse.custom_field_definitions) {
              customFieldDefinitions = candidatesResponse.custom_field_definitions
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error(`Failed to fetch candidates for round ${round.id} in job ${job.posting_title}:`, error)
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Failed to fetch round templates for job ${job.posting_title}:`, error)
        }
      }
    }

    return {
      candidates: allCandidates,
      template_info: templateInfo,
      custom_field_definitions: customFieldDefinitions,
      candidate_count: allCandidates.length
    }
  }

  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return
      
      // Generate unique request ID
      const currentRequestId = ++requestIdRef.current
      
      // Prevent duplicate calls for the same round
      if (isLoadingRef.current && currentRoundIdRef.current === currentRound.id) {
        return
      }
      
      // Only cancel previous request if this is NOT the first render and we're switching rounds
      if (abortControllerRef.current && !isFirstRenderRef.current && currentRoundIdRef.current !== currentRound.id) {
        abortControllerRef.current.abort()
      }
      
      // Mark that we've passed the first render
      isFirstRenderRef.current = false
      
      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      
      isLoadingRef.current = true
      currentRoundIdRef.current = currentRound.id

      // Clear previous data immediately to show loader
      setRoundData(null)
      setAssessmentMapping(null)
      setIsLoading(true)
      setError(null)

      try {
        let roundResponse
        let mappingResponse

        if (isMultiJobMode) {
          // Multi-job mode: fetch candidates from all jobs with the same round type
          const [multiJobRoundData, mapping] = await Promise.all([
            fetchMultiJobRoundData(currentRound.round_type, currentRound.round_name, abortController.signal),
            getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
              if (error.name !== 'AbortError') {
                console.error('Failed to fetch assessment mapping:', error)
              }
              return null
            })
          ])
          
          roundResponse = multiJobRoundData
          mappingResponse = mapping
        } else {
          // Single-job mode: use existing logic
          const [singleJobRoundData, mapping] = await Promise.all([
            RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal),
            getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
              if (error.name !== 'AbortError') {
                console.error('Failed to fetch assessment mapping:', error)
              }
              return null
            })
          ])
          
          roundResponse = singleJobRoundData
          mappingResponse = mapping
        }
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) {
          return
        }
        
        setRoundData(roundResponse)
        
        // Handle assessment mapping response
        if (mappingResponse) {
          setAssessmentMapping(mappingResponse)

          // Auto-populate settings if mapping exists
          if (mappingResponse.mappings && mappingResponse.mappings.length > 0) {
            const firstMapping = mappingResponse.mappings[0]
            setSparrowAssessmentId(firstMapping.sparrow_assessment_id)
            setBrandId(firstMapping.filter_column || 'surveysparrow')
            setTempAssessmentId(firstMapping.sparrow_assessment_id)
            setTempBrandId(firstMapping.filter_column || 'surveysparrow')
          }
        } else {
          // If mapping fetch failed, set default values
          console.warn('Sparrow assessment mapping not available, using default values')
          setAssessmentMapping(null)
          setBrandId('surveysparrow')
          setTempBrandId('surveysparrow')
        }
        // Initialize status maps from API response
        const initialOriginal: Record<string, RoundStatus> = {}
        const initialCurrent: Record<string, RoundStatus> = {}
        
        roundResponse.candidates.forEach(candidate => {
          const status = candidate.round_status as RoundStatus
          initialOriginal[candidate.id] = status
          initialCurrent[candidate.id] = status
        })
        
        setOriginalStatusById(initialOriginal)
        setCurrentStatusById(initialCurrent)
        setPendingChanges({})
      } catch (error: any) {
        // Don't show error for aborted requests (happens during navigation)
        if (error.name !== 'AbortError') {
          console.error('Error fetching round candidates:', error)
          setError('Failed to load round candidates')
        }
      } finally {
        // Always set loading to false since we're handling request ordering properly
        // The abort signal check in the try block already handles stale requests
        if (!abortController.signal.aborted) {
          setIsLoading(false)
          isLoadingRef.current = false
        }
      }
    }

    fetchRoundData()
    
    // Cleanup function - only abort on unmount, not on round changes
    return () => {
      // We handle round switching inside fetchRoundData, so cleanup only aborts on unmount
      // This prevents the first render from being cancelled
    }
  }, [currentRound?.id])

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    setCurrentStatusById(prev => ({
      ...prev,
      [candidateId]: newStatus
    }))

    // Track changes compared to original state
    const originalStatus = originalStatusById[candidateId]
    if (originalStatus === newStatus) {
      // Remove from pending changes if reverting to original
      setPendingChanges(prev => {
        const newPending = { ...prev }
        delete newPending[candidateId]
        return newPending
      })
    } else {
      // Add/update pending change
      setPendingChanges(prev => ({
        ...prev,
        [candidateId]: newStatus
      }))
    }
  }


  const handleProgressToNextRound = async () => {
    if (!currentRound?.id || !roundData) return

    setIsProgressingCandidates(true)
    try {
      // 1) Persist ALL statuses for CURRENT round (not just changed)
      const currentRoundUpdates = (roundData.candidates || []).map(c => ({
        candidate_id: c.id,
        status: (currentStatusById[c.id] || 'action_pending') as RoundStatus,
      }))
      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: currentRoundUpdates,
      })

      // 2) Build full candidate list for the NEXT round using current statuses
      const allCandidateIds = (roundData.candidates || []).map(c => c.id)

      const nextRound = rounds[currentStepIndex + 1]
      if (!nextRound) {
        alert('No next round available.')
        return
      }

      // 3) Progress candidates to next round using the same status from the current round, for ALL candidates
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
      setError('Failed to progress candidates to next round')
    } finally {
      setIsProgressingCandidates(false)
    }
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

  // Bulk evaluation function
  const handleBulkEvaluation = async () => {
    if (!roundData?.candidates || !sparrowAssessmentId.trim()) {
      setBulkEvaluationError('No candidates available or assessment ID not configured')
      return
    }

    if (!brandId || brandId.trim() === '') {
      setBulkEvaluationError('Brand ID not configured. Please ensure the sparrow assessment mapping is properly set up.')
      return
    }

    const candidatesWithoutEvaluation = roundData.candidates.filter(
      candidate => !candidate.candidate_rounds?.[0]?.is_evaluation
    )

    if (candidatesWithoutEvaluation.length === 0) {
      setBulkEvaluationError('All candidates already have evaluations')
      return
    }

    setIsBulkEvaluating(true)
    setBulkEvaluationError(null)
    setBulkEvaluationProgress({ completed: 0, total: candidatesWithoutEvaluation.length })

    const BATCH_SIZE = 20 // Process 20 candidates in parallel
    const results = []
    let completed = 0

    // Split candidates into batches
    const batches = []
    for (let i = 0; i < candidatesWithoutEvaluation.length; i += BATCH_SIZE) {
      batches.push(candidatesWithoutEvaluation.slice(i, i + BATCH_SIZE))
    }

    console.log(`Processing ${candidatesWithoutEvaluation.length} candidates in ${batches.length} batches of up to ${BATCH_SIZE}`)
    console.log(`Using brand_id: ${brandId} (from filter_column in sparrow assessment mapping)`)

    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      try {
        // Process current batch in parallel
        const batchPromises = batch.map(async (candidate) => {
          try {
            if (!candidate.candidate_rounds?.[0]?.id) {
              return { 
                candidate: candidate.id, 
                success: false, 
                error: 'Missing candidate_round_id' 
              }
            }

            const request: SalesEvaluationRequest = {
              email: candidate.email,
              sparrow_assessment_id: sparrowAssessmentId,
              candidate_round_id: candidate.candidate_rounds[0].id,
              account_id: 'salesai',
              brand_id: brandId
            }

            const result = await evaluateSalesCandidate(request, 'GAMES_ARENA')
            return { candidate: candidate.id, success: result.success, error: result.error_message }
          } catch (error) {
            console.error(`Error evaluating candidate ${candidate.id}:`, error)
            return { 
              candidate: candidate.id, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          }
        })

        // Wait for all promises in the batch to complete
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Update progress
        completed += batch.length
        setBulkEvaluationProgress({ completed, total: candidatesWithoutEvaluation.length })

        // Add delay between batches to avoid overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay between batches
        }

      } catch (error) {
        console.error(`Failed to process batch ${batchIndex + 1}:`, error)
        // Continue with next batch instead of failing entirely
        completed += batch.length
        setBulkEvaluationProgress({ completed, total: candidatesWithoutEvaluation.length })
      }
    }

    setIsBulkEvaluating(false)
    
    // Show summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    if (failed === 0) {
      setBulkEvaluationError(null)
    } else {
      setBulkEvaluationError(`Bulk evaluation completed with ${failed} failures out of ${results.length} candidates`)
    }

    // Refresh data after bulk evaluation
    if (currentRound?.id) {
      try {
        const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
        setRoundData(refreshResponse)
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError)
      }
    }
  }

  // Bulk status update function
  const handleBulkStatusUpdate = async () => {
    if (!selectedBulkStatus || !roundData?.candidates || !currentRound?.id) {
      setBulkStatusError('Please select a status and ensure candidates are loaded')
      return
    }

    setIsBulkStatusUpdate(true)
    setBulkStatusError(null)

    try {
      // Update local state immediately for UI responsiveness (same as INTERVIEW round)
      const updatedCandidates = roundData.candidates.map(candidate => ({
        ...candidate,
        candidate_rounds: candidate.candidate_rounds.map(round => ({
          ...round,
          status: selectedBulkStatus as RoundStatus
        }))
      }))
      
      // Update roundData immediately for UI feedback
      setRoundData(prev => prev ? { ...prev, candidates: updatedCandidates } : null)
      
      // Update currentStatusById for consistency (same as INTERVIEW round)
      const statusUpdates: Record<string, RoundStatus> = {}
      roundData.candidates.forEach(candidate => {
        statusUpdates[candidate.id] = selectedBulkStatus as RoundStatus
      })
      setCurrentStatusById(prev => ({ ...prev, ...statusUpdates }))

      setBulkStatusError(`Successfully updated status to "${selectedBulkStatus}" for all ${roundData.candidates.length} candidates`)
      setSelectedBulkStatus('')

    } catch (error) {
      setBulkStatusError(error instanceof Error ? error.message : 'Bulk status update failed')
    } finally {
      setIsBulkStatusUpdate(false)
    }
  }

  const selectedCount = Object.values(currentStatusById).filter(status => status === 'selected').length
  const rejectedCount = Object.values(currentStatusById).filter(status => status === 'rejected').length
  const pendingCount = Object.values(currentStatusById).filter(status => status === 'action_pending').length
  const hasChanges = Object.keys(pendingChanges).length > 0
  const isLastRound = currentStepIndex === rounds.length - 1

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 mb-2" style={{ fontFamily }}>
            {error}
          </div>
          <Button 
            onClick={() => setError(null)}
            variant="outline"
            style={{ fontFamily }}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily }}>
                {currentRound?.round_name || 'Games Arena Round'}
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Game-based assessment for candidates
              </p>
            </div>
          </div>

          {/* Status Summary and Settings */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600" style={{ fontFamily }}>
                {selectedCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Selected
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600" style={{ fontFamily }}>
                {rejectedCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Rejected
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600" style={{ fontFamily }}>
                {pendingCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Pending
              </div>
            </div>
     
            {/* Radar Chart Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetricsModal(true)}
              className="flex items-center gap-2"
              disabled={!roundData?.candidates?.some(c => c.candidate_rounds?.[0]?.is_evaluation)}
            >
              <Users className="w-4 h-4" />
              Radar Chart
            </Button>
            {/* Settings Button - Hide in multi-job mode */}
            {!isMultiJobMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempAssessmentId(sparrowAssessmentId)
                  setTempBrandId(brandId)
                  setShowSettingsModal(true)
                }}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            )}

          </div>
        </div>

        {/* Action Buttons */}
        {!isLastRound && (
          <div className="mt-4">
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                {selectedCount} selected for next round
              </div>
              <Button
                onClick={handleProgressToNextRound}
                disabled={isProgressingCandidates}
                className="flex items-center gap-2"
                style={{
                  backgroundColor: "#6366F1",
                  color: "#FFFFFF",
                  fontFamily
                }}
              >
                {isProgressingCandidates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Next round...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Next round
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Candidates Table */}
      <div className="flex-1 p-8">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <ModernGamesArenaCandidatesTable
              candidates={roundData?.candidates || []}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChange}
              onCandidateUpdated={(updatedCandidate) => {
                // Update the candidate in the local state
                if (roundData?.candidates) {
                  const updatedCandidates = roundData.candidates.map(candidate => 
                    candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                  )
                  setRoundData(prev => prev ? { ...prev, candidates: updatedCandidates } : null)
                }
              }}
              sparrowRoundId={sparrowAssessmentId}
              currentRoundName={currentRound?.round_name || 'Games Arena Round'}
              candidateReEvaluationStates={candidateReEvaluationStates}
              onReEvaluationStateChange={handleReEvaluationStateChange}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <RoundSettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false)
              setBulkEvaluationError(null)
              setBulkStatusError(null)
              setSelectedBulkStatus('')
        }}
        roundType="GAMES_ARENA"
        roundName={currentRound?.round_name || 'Games Arena Round'}
        primaryId={tempAssessmentId}
        setPrimaryId={setTempAssessmentId}
        secondaryId={tempBrandId}
        setSecondaryId={setTempBrandId}
        candidatesCount={(roundData?.candidates || []).length}
        candidatesWithoutEvaluations={(roundData?.candidates || []).filter(candidate => !candidate.candidate_rounds?.[0]?.is_evaluation).length}
        isBulkEvaluating={isBulkEvaluating}
        bulkEvaluationProgress={bulkEvaluationProgress}
        bulkEvaluationError={bulkEvaluationError}
        onBulkEvaluation={handleBulkEvaluation}
        selectedBulkStatus={selectedBulkStatus}
        setSelectedBulkStatus={setSelectedBulkStatus}
        isBulkStatusUpdate={isBulkStatusUpdate}
        bulkStatusError={bulkStatusError}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onSave={() => {
                setSparrowAssessmentId(tempAssessmentId)
                setBrandId(tempBrandId)
                setShowSettingsModal(false)
              }}
        onCancel={() => setShowSettingsModal(false)}
        hasValidConfiguration={() => tempAssessmentId.trim() !== ''}
      />

      {/* Competency Metrics Modal */}
      <CompetencyMetricsModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        candidates={roundData?.candidates || []}
        roundInfo={roundData?.template_info}
      />
    </div>
  )
}
