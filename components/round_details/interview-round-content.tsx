"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Settings } from "lucide-react"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import { evaluateInterviewCandidateFromFile, evaluateInterviewCandidateFromSparrowInterviewer, type SparrowInterviewerEvaluationRequest } from "@/lib/api/evaluation"
import { getSparrowAssessmentMapping } from "@/lib/api/sparrow-assessment-mapping"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse, RoundCandidate } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, MapPin, Calendar, Clock, ChevronDown } from "lucide-react"
import { CandidateEvaluationPanel } from "./candidate-evaluation-panel"
import { ModernInterviewCandidatesTable } from "./modern-interview-candidates-table"
import { RoundSettingsModal } from "./round-settings-modal"
import { CompetencyMetricsModal } from "./competency-metrics-modal"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"
import { useToast } from "@/hooks/use-toast"


type RoundStatus = 'selected' | 'rejected' | 'action_pending'

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

interface InterviewRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

interface RoundStatusDropdownProps {
  currentStatus: RoundStatus
  candidateId: string
  onStatusChange: (candidateId: string, newStatus: RoundStatus) => void
}

function RoundStatusDropdown({ currentStatus, candidateId, onStatusChange }: RoundStatusDropdownProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const currentConfig = ROUND_STATUS_CONFIG[currentStatus]

  const handleStatusChange = (newStatus: RoundStatus) => {
    onStatusChange(candidateId, newStatus)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-8 px-3"
          style={{
            backgroundColor: currentConfig.bgColor,
            color: currentConfig.color,
            borderColor: currentConfig.color,
            fontFamily
          }}
        >
          <span className="text-xs">{currentConfig.label}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {Object.entries(ROUND_STATUS_CONFIG).map(([status, config]) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status as RoundStatus)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: config.color }}
            />
            <span style={{ fontFamily }}>{config.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function InterviewRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: InterviewRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const { isMultiJobMode } = useMultiJobContextSafe()
  const { toast } = useToast()

  // Toast notification tracking for bulk evaluation
  const bulkEvaluationToastRef = useRef<{ id: string; update: (props: any) => void } | null>(null)
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>([])
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, RoundStatus>>({})
  
  // Re-evaluation states for all candidates
  const [candidateReEvaluationStates, setCandidateReEvaluationStates] = useState<Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>>({})
  
  // Sparrow Interviewer round ID settings
  const [showRoundIdModal, setShowRoundIdModal] = useState(false)
  const [sparrowRoundId, setSparrowRoundId] = useState<string>('')
  const [tempRoundId, setTempRoundId] = useState<string>('')
  
  // Bulk evaluation state
  const [isBulkEvaluating, setIsBulkEvaluating] = useState(false)
  const [bulkEvaluationProgress, setBulkEvaluationProgress] = useState({ completed: 0, total: 0 })
  const [bulkEvaluationError, setBulkEvaluationError] = useState<string | null>(null)
  
  // Bulk status update state
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<RoundStatus | ''>('')
  const [isBulkStatusUpdate, setIsBulkStatusUpdate] = useState(false)
  const [bulkStatusError, setBulkStatusError] = useState<string | null>(null)

  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  // Local storage key for round ID settings - using specific round template ID for uniqueness
  const getRoundIdStorageKey = () => {
    const roundTemplateId = currentRound?.id
    return `sparrow_round_id_${roundTemplateId}`
  }

  // Load saved round ID from localStorage or fetch from API
  useEffect(() => {
    const loadSparrowRoundId = async () => {
      if (!currentRound?.id) return

      const storageKey = getRoundIdStorageKey()
      const savedRoundId = localStorage.getItem(storageKey)
      
      // Priority 1: Try to get from API mapping first
      try {
        const mappingResponse = await getSparrowAssessmentMapping(currentRound.id)
        if (mappingResponse.mappings && mappingResponse.mappings.length > 0) {
          const firstMapping = mappingResponse.mappings[0]
          if (firstMapping.sparrow_assessment_id) {
            console.log('Using sparrow assessment ID from API mapping:', firstMapping.sparrow_assessment_id)
            setSparrowRoundId(firstMapping.sparrow_assessment_id)
            return
          }
        }
      } catch (error) {
        console.warn('Failed to fetch sparrow assessment mapping from API:', error)
        // Continue to next priority level
      }

      // Priority 2: Use saved round ID from localStorage
      if (savedRoundId) {
        console.log('Using sparrow assessment ID from localStorage:', savedRoundId)
        setSparrowRoundId(savedRoundId)
      } else {
        // Priority 3: Try fallback based on round name
        const fallbackId = getFallbackAssessmentId(currentRound.round_name)
        if (fallbackId) {
          console.log('Using sparrow assessment ID from fallback mapping:', fallbackId)
          setSparrowRoundId(fallbackId)
        } else {
          // Reset to empty if no assessment ID available
          console.log('No sparrow assessment ID available for round:', currentRound.round_name)
          setSparrowRoundId('')
        }
      }
    }

    loadSparrowRoundId()
  }, [currentRound?.id])

  // Save round ID to localStorage
  const saveSparrowRoundId = (roundId: string) => {
    if (currentRound?.id) {
      const storageKey = getRoundIdStorageKey()
      localStorage.setItem(storageKey, roundId)
      setSparrowRoundId(roundId)
    }
  }

  // Handle round ID modal
  const handleOpenRoundIdModal = () => {
    setTempRoundId(sparrowRoundId)
    setShowRoundIdModal(true)
  }

  const handleSaveRoundId = () => {
    saveSparrowRoundId(tempRoundId.trim())
    setBulkEvaluationError(null)
    setBulkStatusError(null)
    setShowRoundIdModal(false)
  }

  const handleCancelRoundId = () => {
    setTempRoundId('')
    setBulkEvaluationError(null)
    setBulkStatusError(null)
    setSelectedBulkStatus('')
    setShowRoundIdModal(false)
  }

  // Get candidates without evaluations
  const getCandidatesWithoutEvaluations = () => {
    return localCandidates.filter(candidate => !candidate.candidate_rounds?.[0]?.is_evaluation)
  }

  // Check if assessment ID is available (simplified since it's now set at round level)
  const hasAssessmentId = () => {
    return sparrowRoundId && sparrowRoundId.trim() !== ''
  }



  // Fallback round ID mappings for common round names (lowest priority)
  const getFallbackAssessmentId = (roundName?: string): string | null => {
    if (!roundName) return null
    
    const roundMappings: Record<string, string> = {
      'Statistics': 'statistics-001',
      'ML-Foundation': 'classical-ml-001', 
      'LLM': 'llm-001',
      'DEEP LEARNING': 'deep-learning-001'
    }
    
    // Try exact match first
    if (roundMappings[roundName]) {
      return roundMappings[roundName]
    }
    
    // Try case-insensitive match
    const lowerRoundName = roundName.toLowerCase()
    for (const [key, value] of Object.entries(roundMappings)) {
      if (key.toLowerCase() === lowerRoundName) {
        return value
      }
    }
    
    return null
  }

  // Handle bulk evaluation for all candidates without evaluations (with batch parallel processing)
  const handleBulkEvaluation = async () => {
    if (!sparrowRoundId || sparrowRoundId.trim() === '') {
      setBulkEvaluationError('No sparrow assessment ID available. Please configure round ID in settings, check API mapping, or ensure hardcoded fallbacks are available.')
      return
    }

    const candidatesWithoutEvaluation = getCandidatesWithoutEvaluations()
    if (candidatesWithoutEvaluation.length === 0) {
      setBulkEvaluationError('No candidates found without evaluations')
      return
    }

    setIsBulkEvaluating(true)
    setBulkEvaluationError(null)
    setBulkEvaluationProgress({ completed: 0, total: candidatesWithoutEvaluation.length })

    // Show initial toast notification
    const initialToast = toast({
      title: "Bulk Evaluation Started",
      description: `Evaluating ${candidatesWithoutEvaluation.length} candidates in background...`,
      duration: 8000, // 8 seconds
    })
    bulkEvaluationToastRef.current = initialToast

    const BATCH_SIZE = 33 // Process 18 candidates in parallel
    const results = []
    let completed = 0

    // Split candidates into batches
    const batches = []
    for (let i = 0; i < candidatesWithoutEvaluation.length; i += BATCH_SIZE) {
      batches.push(candidatesWithoutEvaluation.slice(i, i + BATCH_SIZE))
    }

    console.log(`Processing ${candidatesWithoutEvaluation.length} candidates in ${batches.length} batches of up to ${BATCH_SIZE}`)

    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      try {
        // Process current batch in parallel
        const batchPromises = batch.map(async (candidate) => {
          try {
            if (!candidate.candidate_rounds?.[0]?.id || !candidate.job_opening_id) {
              return { 
                candidate: candidate.id, 
                success: false, 
                error: 'Missing required candidate information' 
              }
            }

            const request: SparrowInterviewerEvaluationRequest = {
              email: candidate.email,
              job_round_template_id: sparrowRoundId,
              candidate_round_id: candidate.candidate_rounds[0].id,
              job_opening_id: candidate.job_opening_id
            }

            const result = await evaluateInterviewCandidateFromSparrowInterviewer(request)
            
            if (result.success) {
              // Update candidate with evaluation
              const updatedCandidate: RoundCandidate = {
                ...candidate,
                candidate_rounds: candidate.candidate_rounds.map(round => ({
                  ...round,
                  is_evaluation: true,
                  evaluations: [{
                    id: result.result_id || `eval-${Date.now()}`,
                    candidate_round_id: round.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    evaluation_result: {
                      evaluation_summary: result.evaluation_summary || '',
                      competency_evaluation: result.competency_evaluation || {
                        competency_scores: [],
                        overall_percentage_score: 0
                      },
                      overall_percentage_score: result.competency_evaluation?.overall_percentage_score || 0,
                      interviewer_evaluation_summary: result.interviewer_evaluation_summary || '',
                      transcript_text: result.file_metadata?.transcript_text || ''
                    }
                  }]
                }))
              }

              // Update local candidates list
              setLocalCandidates(prev => 
                prev.map(c => c.id === candidate.id ? updatedCandidate : c)
              )

              return { candidate: candidate.id, success: true, updatedCandidate }
            } else {
              return { candidate: candidate.id, success: false, error: result.error_message }
            }
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

        // Update toast with progress
        if (bulkEvaluationToastRef.current) {
          bulkEvaluationToastRef.current.update({
            title: "Bulk Evaluation in Progress",
            description: `Evaluated ${completed} of ${candidatesWithoutEvaluation.length} candidates...`,
            duration: 6000, // 6 seconds
          })
        }

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

    // Show final toast notification with detailed results
    if (bulkEvaluationToastRef.current) {
      const totalProcessed = results.length
      const errorMessages = results
        .filter(r => !r.success && r.error)
        .map(r => r.error)
        .slice(0, 3) // Show only first 3 errors to keep toast readable

      let description = `Processed ${totalProcessed} candidates: ${successful} successful`
      if (failed > 0) {
        description += `, ${failed} failed`
        if (errorMessages.length > 0) {
          description += `\nErrors: ${errorMessages.join('; ')}`
          if (results.filter(r => !r.success && r.error).length > 3) {
            description += ` (+${results.filter(r => !r.success && r.error).length - 3} more errors)`
          }
        }
      }

      bulkEvaluationToastRef.current.update({
        title: failed === 0 ? "Bulk Evaluation Complete" : "Bulk Evaluation Finished with Issues",
        description: description,
        duration: failed === 0 ? 4000 : 8000, // 4 seconds for success, 8 seconds for errors
      })
    }

    if (failed === 0) {
      setBulkEvaluationError(null)
    } else {
      setBulkEvaluationError(`Bulk evaluation completed: ${successful} successful, ${failed} failed`)
    }
  }

  // Handle bulk status update for all candidates
  const handleBulkStatusUpdate = async () => {
    if (!selectedBulkStatus) {
      setBulkStatusError('Please select a status to apply to all candidates')
      return
    }

    if (localCandidates.length === 0) {
      setBulkStatusError('No candidates found to update')
      return
    }

    setIsBulkStatusUpdate(true)
    setBulkStatusError(null)

    try {
      // Update all candidates locally first for immediate UI feedback
      const updatedCandidates = localCandidates.map(candidate => ({
        ...candidate,
        candidate_rounds: candidate.candidate_rounds.map(round => ({
          ...round,
          status: selectedBulkStatus
        }))
      }))

      setLocalCandidates(updatedCandidates)

      // Update currentStatusById for consistency
      const statusUpdates: Record<string, RoundStatus> = {}
      localCandidates.forEach(candidate => {
        statusUpdates[candidate.id] = selectedBulkStatus as RoundStatus
      })
      setCurrentStatusById(prev => ({ ...prev, ...statusUpdates }))

      setBulkStatusError(`Successfully updated status to "${selectedBulkStatus}" for all ${localCandidates.length} candidates`)
      setSelectedBulkStatus('')
      
    } catch (error) {
      console.error('Error updating bulk status:', error)
      setBulkStatusError('Failed to update candidate statuses')
    } finally {
      setIsBulkStatusUpdate(false)
    }
  }


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
      setLocalCandidates([])
      setIsLoading(true)
      setError(null)

      try {
        const response = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal)
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) {
          return
        }
        
        setRoundData(response)
        setLocalCandidates(response.candidates || [])
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

    // Wrap the fetchRoundData call in try-catch to handle any AbortErrors
    const safeFetchRoundData = async () => {
      try {
        await fetchRoundData()
      } catch (error: any) {
        // Silently ignore AbortErrors that bubble up
        if (error.name !== 'AbortError') {
          console.error('Unexpected error in fetchRoundData:', error)
        }
      }
    }

    safeFetchRoundData()
    
    // Cleanup function to cancel ongoing requests when component unmounts or round changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentRound?.id])

  const handleRefresh = () => {
    if (currentRound?.id) {
      setRoundData(null)
      setError(null)
      setIsLoading(true)
    }
  }

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
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

  const getCandidateRoundStatus = (candidate: RoundCandidate): RoundStatus => {
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      const roundStatus = candidate.candidate_rounds[0].status
      return roundStatus as RoundStatus
    }
    return candidate.round_status as RoundStatus
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

  const handleFileUpload = async (candidate: RoundCandidate, file: File) => {
    try {
      setUploadingFor(candidate.id)
      setFileError(null)
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const candidateRoundId = candidate.candidate_rounds?.[0]?.id
      const file_type = file.type === 'application/pdf' ? 'pdf' : 'txt'
      if (!candidateRoundId) throw new Error('Missing candidate_round_id')
      const result = await evaluateInterviewCandidateFromFile({
        candidate_round_id: candidateRoundId,
        job_opening_id: candidate.job_opening_id,
        file_type,
        file_content: base64,
      })
      // Update local state with new evaluation
      setLocalCandidates(prev => prev.map(c => {
        if (c.id !== candidate.id) return c
        const updated = { ...c }
        if (!updated.candidate_rounds || updated.candidate_rounds.length === 0) return updated
        updated.candidate_rounds[0].is_evaluation = true
        updated.candidate_rounds[0].evaluations = [
          {
            id: result.result_id || `eval-${Date.now()}`,
            candidate_round_id: candidateRoundId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            evaluation_result: {
              evaluation_summary: result.evaluation_summary || '',
              competency_evaluation: result.competency_evaluation || { competency_scores: [], overall_percentage_score: 0 },
              overall_percentage_score: result.competency_evaluation?.overall_percentage_score || 0,
              transcript_text: result.transcript_text || ''
            },
          },
        ]
        return updated
      }))
    } catch (e: any) {
      setFileError(e?.message || 'Upload failed')
    } finally {
      setUploadingFor(null)
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

  const selectedCandidatesCount = localCandidates.filter(candidate => {
    const current = currentStatusById[candidate.id]
    const original = originalStatusById[candidate.id]
    return current === 'selected' && current !== original
  }).length

  const hasNextRound = currentStepIndex < rounds.length - 1
  const nextRound = hasNextRound ? rounds[currentStepIndex + 1] : null

  return (
    <div className="flex-1 bg-gray-50">
      <div className="w-full p-6">
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
                      backgroundColor: '#DBEAFE',
                      color: '#3B82F6',
                      fontFamily
                    }}
                  >
                    INTERVIEW
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
                </div>
              </div>

              {/* Round Stats & Actions */}
              <div className="flex items-center gap-6">
                {roundData && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily }}>
                      {localCandidates.length}
                    </div>
                    <div className="text-sm text-gray-600" style={{ fontFamily }}>
                      Candidate{localCandidates.length !== 1 ? 's' : ''}
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
        
                {/* Sparrow Interviewer Settings Button (for INTERVIEW rounds only) - Hide in multi-job mode */}
                {!isMultiJobMode && (
                  <Button
                    onClick={handleOpenRoundIdModal}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    style={{ fontFamily }}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                )}


                {/* Next Round Button - Hide in multi-job mode */}
                {hasNextRound && !isMultiJobMode && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-gray-600" style={{ fontFamily }}>
                      {selectedCandidatesCount} selected for next round
                    </div>
                    <Button
                      onClick={handleProgressToNextRound}
                      disabled={isProgressingCandidates}
                      className="flex items-center gap-2"
                      style={{
                        backgroundColor: "#10B981",
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {fileError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700" style={{ fontFamily }}>
                {fileError}
              </span>
            </div>
          </div>
        )}

        {/* Interview-specific candidates table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <ModernInterviewCandidatesTable
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
              sparrowRoundId={sparrowRoundId}
              currentRoundName={currentRound?.round_name || 'Interview Round'}
              candidateReEvaluationStates={candidateReEvaluationStates}
              onReEvaluationStateChange={handleReEvaluationStateChange}
            />
          </div>
        </div>
      </div>

      {/* Round Settings Modal */}
      <RoundSettingsModal
        isOpen={showRoundIdModal}
        onClose={() => {
          setShowRoundIdModal(false)
              setBulkEvaluationError(null)
              setBulkStatusError(null)
              setSelectedBulkStatus('')
        }}
        roundType="INTERVIEW"
        roundName={currentRound?.round_name || 'Current Round'}
        primaryId={tempRoundId}
        setPrimaryId={setTempRoundId}
        candidatesCount={localCandidates.length}
        candidatesWithoutEvaluations={getCandidatesWithoutEvaluations().length}
        isBulkEvaluating={isBulkEvaluating}
        bulkEvaluationProgress={bulkEvaluationProgress}
        bulkEvaluationError={bulkEvaluationError}
        onBulkEvaluation={handleBulkEvaluation}
        selectedBulkStatus={selectedBulkStatus}
        setSelectedBulkStatus={setSelectedBulkStatus}
        isBulkStatusUpdate={isBulkStatusUpdate}
        bulkStatusError={bulkStatusError}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onSave={handleSaveRoundId}
        onCancel={handleCancelRoundId}
        hasValidConfiguration={() => Boolean(hasAssessmentId())}
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
