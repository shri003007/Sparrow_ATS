"use client"

import { useState, useEffect } from "react"
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
    label: 'Action Pending',
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
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
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


  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
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
      } catch (error) {
        console.error('Error fetching round data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load round data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoundData()
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
    
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      const updatedCandidate = { ...selectedCandidate }
      if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
        updatedCandidate.candidate_rounds[0].status = newStatus
      } else {
        updatedCandidate.round_status = newStatus
      }
      setSelectedCandidate(updatedCandidate)
    }
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

  const openEvaluationPanel = (candidate: RoundCandidate) => {
    setSelectedCandidate(candidate)
    setIsPanelOpen(true)
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
      if (selectedCandidate?.id === candidate.id) {
        setSelectedCandidate(prev => {
          if (!prev) return prev
          const updated = { ...prev }
          if (updated.candidate_rounds && updated.candidate_rounds.length > 0) {
            updated.candidate_rounds[0].is_evaluation = true
            updated.candidate_rounds[0].evaluations = setLocalCandidates as any
          }
          return updated
        })
      }
    } catch (e: any) {
      setFileError(e?.message || 'Upload failed')
    } finally {
      setUploadingFor(null)
    }
  }


  const closeEvaluationPanel = () => {
    setIsPanelOpen(false)
    setSelectedCandidate(null)
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

                {/* Sparrow Interviewer Settings Button (for INTERVIEW rounds only) */}
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

                {/* Next Round Button */}
                {hasNextRound && (
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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600" style={{ fontFamily }}>
                  Loading candidates...
                </span>
              </div>
            ) : localCandidates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4" style={{ fontFamily }}>
                  No candidates found for this round
                </div>
                {roundData?.template_info && (
                  <div className="text-sm text-gray-400" style={{ fontFamily }}>
                    {roundData.template_info.round_name} • Round {roundData.template_info.order_index}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead style={{ fontFamily }}>Candidate</TableHead>
                      <TableHead style={{ fontFamily }}>Contact</TableHead>
                      <TableHead style={{ fontFamily }}>Status</TableHead>
                      <TableHead style={{ fontFamily }}>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {localCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      {/* Candidate Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback style={{ fontFamily }}>
                              {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors"
                              style={{ fontFamily }}
                              onClick={() => openEvaluationPanel(candidate)}
                            >
                              {candidate.name}
                            </button>
                            <div className="text-sm text-gray-500 flex items-center gap-1" style={{ fontFamily }}>
                              <Calendar className="w-3 h-3" />
                              {new Date(candidate.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm" style={{ fontFamily }}>
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{candidate.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm" style={{ fontFamily }}>
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{candidate.mobile_phone}</span>
                          </div>
                          {candidate.current_location && (
                            <div className="flex items-center gap-1 text-sm" style={{ fontFamily }}>
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-600">{candidate.current_location}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <RoundStatusDropdown
                          currentStatus={getCandidateRoundStatus(candidate)}
                          candidateId={candidate.id}
                          onStatusChange={handleStatusChange}
                        />
                      </TableCell>

                      {/* Interview Score */}
                      <TableCell>
                        {(() => {
                          const hasEvaluation = candidate.candidate_rounds?.[0]?.is_evaluation
                          const evaluation = candidate.candidate_rounds?.[0]?.evaluations?.[0]?.evaluation_result
                          
                          if (hasEvaluation && evaluation?.overall_percentage_score !== undefined) {
                            const score = evaluation.overall_percentage_score
                            const getScoreColor = (score: number) => {
                              if (score >= 80) return "#10b981" // green-500
                              if (score >= 60) return "#f59e0b" // amber-500
                              return "#ef4444" // red-500
                            }
                            
                            return (
                              <div className="flex items-center justify-center">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                  style={{
                                    backgroundColor: `${getScoreColor(score)}20`,
                                    borderColor: getScoreColor(score)
                                  }}
                                >
                                  <span 
                                    className="text-sm font-medium" 
                                    style={{ 
                                      fontFamily,
                                      color: getScoreColor(score)
                                    }}
                                  >
                                    {score}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400 ml-2" style={{ fontFamily }}>
                                  %
                                </span>
                              </div>
                            )
                          } else {
                            return (
                              <div className="flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                                  <span className="text-sm font-medium text-gray-400" style={{ fontFamily }}>
                                    -
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400 ml-2" style={{ fontFamily }}>
                                  %
                                </span>
                              </div>
                            )
                          }
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sparrow Interviewer Round ID Settings Modal */}
      <Dialog 
        open={showRoundIdModal} 
        onOpenChange={(open) => {
          if (!isBulkEvaluating && !isBulkStatusUpdate) {
            setShowRoundIdModal(open)
            if (!open) {
              setBulkEvaluationError(null)
              setBulkStatusError(null)
              setSelectedBulkStatus('')
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sparrow Interviewer Settings - {currentRound?.round_name || 'Current Round'}</DialogTitle>
            <DialogDescription>
              Configure the round ID that will be sent to Sparrow Interviewer for all candidates in this specific round ({currentRound?.round_name || 'Current Round'}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="round-id" className="text-right">
                Round ID
              </Label>
              <Input
                id="round-id"
                value={tempRoundId}
                onChange={(e) => setTempRoundId(e.target.value)}
                placeholder="Enter Sparrow Interviewer round ID"
                className="col-span-3"
                disabled={isBulkEvaluating || isBulkStatusUpdate}
              />
            </div>
            <div className="text-sm text-gray-500 col-span-4">
              This round ID will be used instead of the job_round_template_id when making API calls to Sparrow Interviewer for this specific round ({currentRound?.round_name || 'Current Round'}). Each round can have its own unique round ID.
            </div>

            {/* Bulk Evaluation Section */}
            <div className="col-span-4 mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Bulk Evaluation</h4>
              
              {/* Candidates without evaluation count */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-blue-900">
                      Candidates without evaluation: {getCandidatesWithoutEvaluations().length}
                    </span>
                    <p className="text-xs text-blue-700 mt-1">
                      Only candidates without existing evaluations will be processed
                    </p>
                  </div>
                </div>
              </div>

              {/* Bulk evaluation button */}
              <Button
                onClick={handleBulkEvaluation}
                disabled={isBulkEvaluating || !hasAssessmentId() || getCandidatesWithoutEvaluations().length === 0}
                className="w-full mb-4"
                style={{
                  backgroundColor: "#10B981",
                  color: "#FFFFFF"
                }}
              >
                {isBulkEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating ({bulkEvaluationProgress.completed}/{bulkEvaluationProgress.total})
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Evaluate All via Sparrow Interviewer
                  </>
                )}
              </Button>

              {/* Progress display */}
              {isBulkEvaluating && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${(bulkEvaluationProgress.completed / bulkEvaluationProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
              )}

              {/* Error/success messages */}
              {bulkEvaluationError && (
                <div className={`text-xs p-3 rounded border ${
                  bulkEvaluationError.includes('successful') 
                    ? 'text-green-700 bg-green-50 border-green-200' 
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}>
                  {bulkEvaluationError}
                </div>
              )}
            </div>

            {/* Bulk Status Update Section */}
            <div className="col-span-4 mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Bulk Status Update</h4>
              
              {/* Current candidates count */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-purple-900">
                      Total candidates: {localCandidates.length}
                    </span>
                    <p className="text-xs text-purple-700 mt-1">
                      Update status for all candidates in this round
                    </p>
                  </div>
                </div>
              </div>

              {/* Status selection and update button */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select value={selectedBulkStatus} onValueChange={(value) => setSelectedBulkStatus(value as RoundStatus | '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status for all candidates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="action_pending">Action Pending</SelectItem>
                        <SelectItem value="selected">Selected</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleBulkStatusUpdate}
                    disabled={isBulkStatusUpdate || !selectedBulkStatus || localCandidates.length === 0 || isBulkEvaluating}
                    style={{
                      backgroundColor: "#8B5CF6",
                      color: "#FFFFFF"
                    }}
                  >
                    {isBulkStatusUpdate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update All'
                    )}
                  </Button>
                </div>
              </div>

              {/* Status update messages */}
              {bulkStatusError && (
                <div className={`text-xs p-3 rounded border mt-3 ${
                  bulkStatusError.includes('Successfully') 
                    ? 'text-green-700 bg-green-50 border-green-200' 
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}>
                  {bulkStatusError}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancelRoundId}
              disabled={isBulkEvaluating || isBulkStatusUpdate}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveRoundId}
              disabled={isBulkEvaluating || isBulkStatusUpdate}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview-specific Evaluation Panel */}
      <CandidateEvaluationPanel
        candidate={selectedCandidate}
        isOpen={isPanelOpen}
        onClose={closeEvaluationPanel}
        roundType="INTERVIEW"
        onStatusChange={handleStatusChange}
        isEvaluating={false}
        candidateReEvaluationStates={candidateReEvaluationStates}
        onReEvaluationStateChange={handleReEvaluationStateChange}
        sparrowRoundId={sparrowRoundId}
        currentRoundName={currentRound?.round_name || ''}
        onCandidateUpdated={(updatedCandidate) => {
          setLocalCandidates(prev => 
            prev.map(candidate => 
              candidate.id === updatedCandidate.id ? updatedCandidate : candidate
            )
          )
          // Update selected candidate if it's the one that was updated
          if (selectedCandidate && selectedCandidate.id === updatedCandidate.id) {
            setSelectedCandidate(updatedCandidate)
          }
        }}
      />
    </div>
  )
}
