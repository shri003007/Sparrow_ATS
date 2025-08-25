"use client"

import React, { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Mail, Phone, MapPin, Calendar, Clock, Loader2, ChevronDown, FileText } from "lucide-react"
import type { RoundCandidate, CustomFieldDefinition } from "@/lib/round-candidate-types"
import { CandidateEvaluationPanel } from "./candidate-evaluation-panel"
import { evaluateResumeCandidatesBatch, type ResumeEvaluationRequest } from "@/lib/api/evaluation"

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

interface RoundCandidatesTableProps {
  candidates: RoundCandidate[]
  customFieldDefinitions: CustomFieldDefinition[]
  isLoading?: boolean
  roundInfo?: {
    round_name: string
    round_type: string
    order_index: number
  }
  jobOpeningId?: string
  onStatusChange?: (candidateId: string, newStatus: RoundStatus) => void
  onCandidateUpdated?: (updatedCandidate: RoundCandidate) => void
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

export function RoundCandidatesTable({ 
  candidates, 
  customFieldDefinitions, 
  isLoading = false,
  roundInfo,
  jobOpeningId,
  onStatusChange = () => {},
  onCandidateUpdated = () => {}
}: RoundCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>(candidates)
  const [evaluatingCandidates, setEvaluatingCandidates] = useState<Set<string>>(new Set())
  const [batchEvaluationProgress, setBatchEvaluationProgress] = useState<{
    completed: number
    total: number
    isActive: boolean
  }>({ completed: 0, total: 0, isActive: false })
  
  // CRITICAL: Track candidates that have been processed to prevent infinite loops
  const [processedCandidates, setProcessedCandidates] = useState<Set<string>>(new Set())

  // Update local candidates when prop changes
  React.useEffect(() => {
    setLocalCandidates(candidates)
    
    // Reset processed candidates only if we have new candidates
    setProcessedCandidates(prev => {
      const currentCandidateIds = new Set(candidates.map(c => c.id))
      const filteredProcessed = new Set<string>()
      
      // Keep only processed candidates that still exist in the current list
      prev.forEach(id => {
        if (currentCandidateIds.has(id)) {
          filteredProcessed.add(id)
        }
      })
      
      return filteredProcessed
    })
  }, [candidates])

  // Auto-trigger batch resume evaluations for SCREENING rounds without scores
  React.useEffect(() => {
    if (roundInfo?.round_type === 'SCREENING' && jobOpeningId && candidates.length > 0 && !batchEvaluationProgress.isActive) {
      const candidatesNeedingEvaluation = candidates.filter(candidate => {
        const hasEvaluation = candidate.candidate_rounds?.[0]?.is_evaluation
        const hasScore = candidate.candidate_rounds?.[0]?.evaluations?.[0]?.evaluation_result?.overall_percentage_score
        // CRITICAL: Don't process candidates that have already been processed (including failures)
        const notProcessed = !processedCandidates.has(candidate.id)
        return (!hasEvaluation || !hasScore) && notProcessed
      })

      if (candidatesNeedingEvaluation.length > 0) {
        console.log(`🚀 Triggering batch evaluation for ${candidatesNeedingEvaluation.length} unprocessed candidates`)
        triggerBatchResumeEvaluation(candidatesNeedingEvaluation, jobOpeningId)
      } else {
        console.log(`✅ All candidates already processed or have scores`)
      }
    }
  }, [candidates, roundInfo, jobOpeningId, batchEvaluationProgress.isActive, processedCandidates])

  const [pendingUpdates, setPendingUpdates] = useState<RoundCandidate[]>([])

  // Handle pending parent updates in a separate effect to avoid React warnings
  React.useEffect(() => {
    if (pendingUpdates.length > 0) {
      pendingUpdates.forEach(updatedCandidate => {
        onCandidateUpdated(updatedCandidate)
      })
      setPendingUpdates([])
    }
  }, [pendingUpdates, onCandidateUpdated])

  const triggerBatchResumeEvaluation = async (candidatesNeedingEvaluation: RoundCandidate[], jobOpeningId: string) => {
    // Mark all candidates as being evaluated
    const candidateIds = candidatesNeedingEvaluation.map(c => c.id)
    setEvaluatingCandidates(new Set(candidateIds))
    
    // CRITICAL: Mark all candidates as processed immediately to prevent re-triggering
    setProcessedCandidates(prev => {
      const newSet = new Set(prev)
      candidateIds.forEach(id => {
        newSet.add(id)
        console.log(`🔒 Marking candidate ${id} as processed to prevent re-evaluation`)
      })
      return newSet
    })
    
    // Set up batch progress tracking
    setBatchEvaluationProgress({
      completed: 0,
      total: candidatesNeedingEvaluation.length,
      isActive: true
    })

    try {
      // Prepare batch requests
      const requests: ResumeEvaluationRequest[] = candidatesNeedingEvaluation
        .map(candidate => {
          const candidateRoundId = candidate.candidate_rounds?.[0]?.id
          if (!candidateRoundId) return null
          return {
            candidate_round_id: candidateRoundId,
            job_opening_id: jobOpeningId
          }
        })
        .filter((req): req is ResumeEvaluationRequest => req !== null)

      console.log(`Starting batch resume evaluation for ${requests.length} candidates`)

      // Process batch with callbacks
      await evaluateResumeCandidatesBatch(
        requests,
        // onBatchComplete callback
        (completed, total) => {
          setBatchEvaluationProgress({
            completed,
            total,
            isActive: completed < total
          })
        },
        // onCandidateComplete callback
        (evaluationResult) => {
          const candidateRoundId = evaluationResult.candidate_round_id
          const candidateId = candidatesNeedingEvaluation.find(
            c => c.candidate_rounds?.[0]?.id === candidateRoundId
          )?.id

          if (candidateId) {
            let updatedCandidateForParent: RoundCandidate | null = null

            // Update the candidate with the evaluation result (both success and error cases)
            setLocalCandidates(prevCandidates => 
              prevCandidates.map(candidate => {
                if (candidate.id === candidateId) {
                  const updatedCandidate = { ...candidate }
                  if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
                    updatedCandidate.candidate_rounds[0].is_evaluation = true
                    
                    // Handle both success and error responses
                    if (evaluationResult.success) {
                      // Success case - full evaluation data
                      updatedCandidate.candidate_rounds[0].evaluations = [{
                        id: `eval-${Date.now()}-${candidateId}`,
                        candidate_round_id: candidateRoundId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        evaluation_result: {
                          candidate_id: evaluationResult.candidate_id || candidateId,
                          job_opening_id: jobOpeningId,
                          candidate_round_id: candidateRoundId,
                          evaluation_method: evaluationResult.evaluation_method,
                          evaluation_summary: evaluationResult.evaluation_summary,
                          evaluation_criteria: evaluationResult.evaluation_criteria,
                          competency_evaluation: evaluationResult.competency_evaluation,
                          overall_percentage_score: evaluationResult.overall_percentage_score,
                          resume_text_extracted: evaluationResult.resume_text_extracted,
                          resume_images_extracted: evaluationResult.resume_images_extracted,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        }
                      }]
                    } else {
                      // Error case - store error information
                      updatedCandidate.candidate_rounds[0].evaluations = [{
                        id: `eval-error-${Date.now()}-${candidateId}`,
                        candidate_round_id: candidateRoundId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        evaluation_result: {
                          candidate_id: candidateId,
                          job_opening_id: jobOpeningId,
                          candidate_round_id: candidateRoundId,
                          evaluation_method: 'failed',
                          evaluation_summary: evaluationResult.evaluation_summary || evaluationResult.error_message || 'Evaluation failed',
                          evaluation_criteria: '',
                          competency_evaluation: {
                            competency_scores: [],
                            overall_percentage_score: 0
                          },
                          overall_percentage_score: 0,
                          resume_text_extracted: evaluationResult.has_resume || false,
                          resume_images_extracted: 0,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        }
                      }]
                    }
                  }
                  
                  // Update selected candidate if it's the same one
                  if (selectedCandidate?.id === candidateId) {
                    setSelectedCandidate(updatedCandidate)
                  }
                  
                  // Store for parent update
                  updatedCandidateForParent = updatedCandidate
                  
                  return updatedCandidate
                }
                return candidate
              })
            )

            // Queue parent update for next effect cycle
            if (updatedCandidateForParent) {
              setPendingUpdates(prev => [...prev, updatedCandidateForParent!])
            }
          }

          // Remove this candidate from evaluating set
          setEvaluatingCandidates(prev => {
            const newSet = new Set(prev)
            if (candidateId) newSet.delete(candidateId)
            return newSet
          })
        }
      )

      console.log('Batch resume evaluation completed')

    } catch (error) {
      console.error('Failed to process batch resume evaluation:', error)
      // Clear all evaluating states on error
      setEvaluatingCandidates(new Set())
    } finally {
      setBatchEvaluationProgress({
        completed: 0,
        total: 0,
        isActive: false
      })
    }
  }

  // Update candidate status locally and notify parent
  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    // Update local candidates array
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
    
    // Update the selected candidate if it's currently open in the panel
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      const updatedCandidate = { ...selectedCandidate }
      if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
        updatedCandidate.candidate_rounds[0].status = newStatus
      } else {
        updatedCandidate.round_status = newStatus
      }
      setSelectedCandidate(updatedCandidate)
    }

    // Notify parent component
    onStatusChange(candidateId, newStatus)
  }

  const toggleRowExpansion = (candidateId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId)
    } else {
      newExpanded.add(candidateId)
    }
    setExpandedRows(newExpanded)
  }

  const openEvaluationPanel = (candidate: RoundCandidate) => {
    setSelectedCandidate(candidate)
    setIsPanelOpen(true)
  }

  const closeEvaluationPanel = () => {
    setIsPanelOpen(false)
    setSelectedCandidate(null)
  }

  const getCandidateRoundStatus = (candidate: RoundCandidate): RoundStatus => {
    // Get the status from the candidate_rounds array
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      const roundStatus = candidate.candidate_rounds[0].status
      return roundStatus as RoundStatus
    }
    // Fallback to round_status if available
    return candidate.round_status as RoundStatus
  }

  const getCustomFieldValue = (candidate: RoundCandidate, fieldId: string) => {
    const customValue = candidate.custom_field_values.find(
      cv => cv.field_definition_id === fieldId
    )
    return customValue?.field_value || '-'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600" style={{ fontFamily }}>
          Loading candidates...
        </span>
      </div>
    )
  }

  if (localCandidates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4" style={{ fontFamily }}>
          No candidates found for this round
        </div>
        {roundInfo && (
          <div className="text-sm text-gray-400" style={{ fontFamily }}>
            {roundInfo.round_name} • Round {roundInfo.order_index}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead style={{ fontFamily }}>Candidate</TableHead>
              <TableHead style={{ fontFamily }}>Contact</TableHead>
              <TableHead style={{ fontFamily }}>Status</TableHead>
              {roundInfo?.round_type === 'SCREENING' && (
                <TableHead style={{ fontFamily }}>Resume Score</TableHead>
              )}
              {customFieldDefinitions.map((field) => (
                <TableHead key={field.id} style={{ fontFamily }}>
                  {field.field_label}
                </TableHead>
              ))}
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
                    {candidate.available_to_join_days && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1" style={{ fontFamily }}>
                        <Clock className="w-3 h-3" />
                        Available in {candidate.available_to_join_days} days
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

                {/* Resume Score - Only for SCREENING rounds */}
                {roundInfo?.round_type === 'SCREENING' && (
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {evaluatingCandidates.has(candidate.id) ? (
                        // Show loader while evaluating
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border-2 border-blue-200">
                            <Spinner variant="default" size={16} className="text-blue-600" />
                          </div>
                          <span className="text-xs text-blue-600" style={{ fontFamily }}>
                            AI
                          </span>
                        </div>
                      ) : candidate.candidate_rounds?.[0]?.evaluations?.[0]?.evaluation_result ? (
                        (() => {
                          const evaluation = candidate.candidate_rounds[0].evaluations[0].evaluation_result
                          const score = evaluation.overall_percentage_score
                          
                          // Check if this is an error case
                          if (score === 0 && evaluation.evaluation_method === 'failed') {
                            // Handle error cases
                            const isNoResume = !evaluation.resume_text_extracted || 
                                             evaluation.evaluation_summary?.includes('No resume found')
                            
                            if (isNoResume) {
                              // No resume case
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-200">
                                    <span className="text-xs font-medium text-orange-600" style={{ fontFamily }}>
                                      ⚠️
                                    </span>
                                  </div>
                                  <span className="text-xs text-orange-600" style={{ fontFamily }}>
                                    No Resume
                                  </span>
                                </div>
                              )
                            } else {
                              // Other evaluation errors
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
                                    <span className="text-xs font-medium text-red-600" style={{ fontFamily }}>
                                      ❌
                                    </span>
                                  </div>
                                  <span className="text-xs text-red-600" style={{ fontFamily }}>
                                    Error
                                  </span>
                                </div>
                              )
                            }
                          }
                          
                          // Success case with score
                          if (score > 0) {
                            const roundedScore = Math.round(score)
                            const getScoreConfig = (score: number) => {
                              if (score >= 80) {
                                return {
                                  bgColor: '#DCFCE7',
                                  textColor: '#16A34A',
                                  borderColor: '#22C55E20'
                                }
                              } else if (score >= 60) {
                                return {
                                  bgColor: '#FEF3C7',
                                  textColor: '#D97706',
                                  borderColor: '#F59E0B20'
                                }
                              } else {
                                return {
                                  bgColor: '#FEE2E2',
                                  textColor: '#DC2626',
                                  borderColor: '#EF444420'
                                }
                              }
                            }
                            const config = getScoreConfig(roundedScore)
                            
                            return (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center border-2"
                                  style={{
                                    backgroundColor: config.bgColor,
                                    borderColor: config.borderColor
                                  }}
                                >
                                  <span 
                                    className="text-sm font-bold" 
                                    style={{ 
                                      fontFamily,
                                      color: config.textColor
                                    }}
                                  >
                                    {roundedScore}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500" style={{ fontFamily }}>
                                  %
                                </span>
                              </div>
                            )
                          }
                          
                          // Fallback case
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                                <span className="text-sm font-medium text-gray-400" style={{ fontFamily }}>
                                  -
                                </span>
                              </div>
                              <span className="text-xs text-gray-400" style={{ fontFamily }}>
                                %
                              </span>
                            </div>
                          )
                        })()
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                            <span className="text-sm font-medium text-gray-400" style={{ fontFamily }}>
                              -
                            </span>
                          </div>
                          <span className="text-xs text-gray-400" style={{ fontFamily }}>
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}

                {/* Custom Fields */}
                {customFieldDefinitions.map((field) => (
                  <TableCell key={field.id}>
                    <span className="text-sm text-gray-900" style={{ fontFamily }}>
                      {getCustomFieldValue(candidate, field.id)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Evaluation Panel */}
      <CandidateEvaluationPanel
        candidate={selectedCandidate}
        isOpen={isPanelOpen}
        onClose={closeEvaluationPanel}
        roundType={roundInfo?.round_type || 'GENERAL'}
        onStatusChange={handleStatusChange}
        isEvaluating={selectedCandidate ? evaluatingCandidates.has(selectedCandidate.id) : false}
        sparrowRoundId=""
        currentRoundName={roundInfo?.round_name || ''}
        onCandidateUpdated={(updatedCandidate) => {
          setLocalCandidates(prev => 
            prev.map(candidate => 
              candidate.id === updatedCandidate.id ? updatedCandidate : candidate
            )
          )
          onCandidateUpdated(updatedCandidate)
        }}
      />
    </>
  )
}