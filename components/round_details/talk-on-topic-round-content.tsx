"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Settings } from "lucide-react"
import { TalkOnTopicCandidatesTable } from "./talk-on-topic-candidates-table"
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

interface TalkOnTopicRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

export function TalkOnTopicRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: TalkOnTopicRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
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

  // Ref to track if data is currently being fetched to prevent duplicate calls
  const isLoadingRef = useRef(false)
  const currentRoundIdRef = useRef<string | null>(null)

  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return
      
      // Prevent duplicate calls
      if (isLoadingRef.current && currentRoundIdRef.current === currentRound.id) {
        return
      }
      
      isLoadingRef.current = true
      currentRoundIdRef.current = currentRound.id

      setIsLoading(true)
      setError(null)

      try {
        // Fetch both round data and assessment mapping in parallel
        const [roundResponse, mappingResponse] = await Promise.all([
          RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id),
          getSparrowAssessmentMapping(currentRound.id).catch(error => {
            console.error('Failed to fetch assessment mapping:', error)
            return null // Return null on error, don't fail the entire request
          })
        ])
        
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
      } catch (error) {
        console.error('Error fetching round candidates:', error)
        setError('Failed to load round candidates')
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    fetchRoundData()
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

  const handleSaveChanges = async () => {
    if (!currentRound?.id || Object.keys(pendingChanges).length === 0) return

    setIsProgressingCandidates(true)
    setError(null)

    try {
      const candidateUpdates = Object.entries(pendingChanges).map(([candidateId, status]) => ({
        candidate_id: candidateId,
        status
      }))

      const response = await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: candidateUpdates
      })

      console.log('Candidate status update response:', response)

      // Update original status to match current status for successful updates
      setOriginalStatusById(prev => ({
        ...prev,
        ...currentStatusById
      }))
      setPendingChanges({})

      // Refresh the data to get updated counts
      const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
      setRoundData(refreshResponse)

    } catch (error) {
      console.error('Error updating candidate statuses:', error)
      setError('Failed to update candidate statuses')
    } finally {
      setIsProgressingCandidates(false)
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

    try {
      for (let i = 0; i < candidatesWithoutEvaluation.length; i++) {
        const candidate = candidatesWithoutEvaluation[i]
        
        if (!candidate.candidate_rounds?.[0]?.id) {
          console.warn(`Skipping candidate ${candidate.email} - missing candidate_round_id`)
          continue
        }

        try {
          const request: SalesEvaluationRequest = {
            email: candidate.email,
            sparrow_assessment_id: sparrowAssessmentId,
            candidate_round_id: candidate.candidate_rounds[0].id,
            account_id: 'salesai',
            brand_id: brandId
          }

          await evaluateSalesCandidate(request, 'TALK_ON_A_TOPIC')
          setBulkEvaluationProgress({ completed: i + 1, total: candidatesWithoutEvaluation.length })
          
          // Add delay between requests to avoid overwhelming the API
          if (i < candidatesWithoutEvaluation.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (candidateError) {
          console.error(`Error evaluating candidate ${candidate.email}:`, candidateError)
          // Continue with next candidate instead of stopping
        }
      }

      // Refresh data after bulk evaluation
      if (currentRound?.id) {
        const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
        setRoundData(refreshResponse)
      }
    } catch (error) {
      setBulkEvaluationError(error instanceof Error ? error.message : 'Bulk evaluation failed')
    } finally {
      setIsBulkEvaluating(false)
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
      const candidateUpdates = roundData.candidates.map(candidate => ({
        candidate_id: candidate.id,
        status: selectedBulkStatus as RoundStatus
      }))

      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: candidateUpdates
      })

      // Refresh data
      const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
      setRoundData(refreshResponse)

      // Update local state
      const newStatusById: Record<string, RoundStatus> = {}
      roundData.candidates.forEach(candidate => {
        newStatusById[candidate.id] = selectedBulkStatus as RoundStatus
      })
      setOriginalStatusById(newStatusById)
      setCurrentStatusById(newStatusById)
      setPendingChanges({})

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
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily }}>
                {currentRound?.round_name || 'Talk on Topic Round'}
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Topic-based discussion assessment for candidates
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
            
            {/* Settings Button */}
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
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleSaveChanges}
              disabled={isProgressingCandidates}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              style={{ fontFamily }}
            >
              {isProgressingCandidates ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <div className="text-sm text-blue-600" style={{ fontFamily }}>
              {Object.keys(pendingChanges).length} unsaved change(s)
            </div>
          </div>
        )}

        {!isLastRound && !hasChanges && (
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
                  backgroundColor: "#9333EA",
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
            <TalkOnTopicCandidatesTable
              candidates={roundData?.candidates || []}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChange}
              currentStatusById={currentStatusById}
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
              currentRoundName={currentRound?.round_name || 'Talk on Topic Round'}
              candidateReEvaluationStates={candidateReEvaluationStates}
              onReEvaluationStateChange={handleReEvaluationStateChange}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog 
        open={showSettingsModal} 
        onOpenChange={(open) => {
          if (!isBulkEvaluating && !isBulkStatusUpdate) {
            setShowSettingsModal(open)
            if (!open) {
              setBulkEvaluationError(null)
              setBulkStatusError(null)
              setSelectedBulkStatus('')
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sales Assessment Settings - {currentRound?.round_name || 'Talk on Topic Round'}</DialogTitle>
            <DialogDescription>
              Configure sales assessment settings and manage bulk operations for all candidates in this round.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Assessment Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Assessment Configuration</h4>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="assessment-id">Sales Assessment ID</Label>
                  <Input
                    id="assessment-id"
                    value={tempAssessmentId}
                    onChange={(e) => setTempAssessmentId(e.target.value)}
                    placeholder="e.g., ice-breaker-001, TS-triple-step"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The assessment ID used for Sparrow Sales Assessment API calls
                  </p>
                </div>
                <div>
                  <Label htmlFor="brand-id">Brand ID</Label>
                  <Select value={tempBrandId} onValueChange={setTempBrandId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surveysparrow">SurveySparrow</SelectItem>
                      <SelectItem value="thrivesparrow">ThriveSparrow</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    The brand identifier for the assessment
                  </p>
                </div>
              </div>
            </div>

            {/* Bulk Operations */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Bulk Operations</h4>
              
              {/* Bulk Evaluation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium">Bulk Evaluation</h5>
                  {isBulkEvaluating && (
                    <div className="text-xs text-blue-600">
                      {bulkEvaluationProgress.completed} / {bulkEvaluationProgress.total}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Evaluate all candidates who don't have evaluations yet
                </p>
                <Button 
                  onClick={handleBulkEvaluation}
                  disabled={isBulkEvaluating || isBulkStatusUpdate || !tempAssessmentId.trim()}
                  className="w-full"
                  size="sm"
                >
                  {isBulkEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    'Bulk Evaluate'
                  )}
                </Button>
                {bulkEvaluationError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {bulkEvaluationError}
                  </div>
                )}
              </div>

              {/* Bulk Status Update */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-medium mb-2">Bulk Status Update</h5>
                <p className="text-xs text-gray-500 mb-3">
                  Set the same status for all candidates in this round
                </p>
                <div className="space-y-3">
                  <Select value={selectedBulkStatus} onValueChange={(value) => setSelectedBulkStatus(value as RoundStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status for all candidates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="action_pending">Action Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkStatusUpdate}
                    disabled={isBulkStatusUpdate || isBulkEvaluating || !selectedBulkStatus}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    {isBulkStatusUpdate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update All Statuses'
                    )}
                  </Button>
                </div>
                {bulkStatusError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {bulkStatusError}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSettingsModal(false)}
              disabled={isBulkEvaluating || isBulkStatusUpdate}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setSparrowAssessmentId(tempAssessmentId)
                setBrandId(tempBrandId)
                setShowSettingsModal(false)
              }}
              disabled={isBulkEvaluating || isBulkStatusUpdate}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
