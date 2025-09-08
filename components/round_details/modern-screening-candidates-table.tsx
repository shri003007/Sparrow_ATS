"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Trash2,
  RefreshCw,
  User,
  Users,
  Phone,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Clock3
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { RoundCandidate, CustomFieldDefinition } from "@/lib/round-candidate-types"
import { CandidateEvaluationPanel } from "./candidate-evaluation-panel"
import { evaluateResumeCandidatesBatch, type ResumeEvaluationRequest } from "@/lib/api/evaluation"

type RoundStatus = 'selected' | 'rejected' | 'action_pending'

const ROUND_STATUS_CONFIG = {
  selected: {
    label: 'Hire',
    color: '#10B981',
    bgColor: '#DCFCE7',
    icon: ThumbsUp
  },
  rejected: {
    label: 'No Hire', 
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: ThumbsDown
  },
  action_pending: {
    label: 'On Hold',
    color: '#F59E0B', 
    bgColor: '#FEF3C7',
    icon: Clock3
  }
} as const

interface ModernScreeningCandidatesTableProps {
  candidates: RoundCandidate[]
  customFieldDefinitions: CustomFieldDefinition[]
  isLoading?: boolean
  roundInfo?: any
  jobOpeningId?: string
  onStatusChange: (candidateId: string, status: RoundStatus) => void
  onCandidateUpdated?: (candidate: RoundCandidate) => void
}

export function ModernScreeningCandidatesTable({
  candidates,
  customFieldDefinitions,
  isLoading = false,
  roundInfo,
  jobOpeningId,
  onStatusChange,
  onCandidateUpdated = () => {}
}: ModernScreeningCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({})
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
    
    // Reset processed candidates when candidates prop changes to allow new evaluations
    setProcessedCandidates(prev => {
      const newSet = new Set<string>()
      candidates.forEach(candidate => {
        const hasEvaluation = candidate.candidate_rounds?.[0]?.is_evaluation
        const hasScore = candidate.candidate_rounds?.[0]?.evaluations?.[0]?.evaluation_result?.overall_percentage_score
        // Only keep candidates that already have evaluation/score to prevent re-processing
        if (hasEvaluation && hasScore !== undefined) {
          newSet.add(candidate.id)
        }
      })
      return newSet
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
                          evaluation_method: 'resume_extraction',
                          evaluation_summary: `Evaluation failed: ${evaluationResult.error}`,
                          evaluation_criteria: [],
                          competency_evaluation: [],
                          overall_percentage_score: 0,
                          resume_text_extracted: '',
                          resume_images_extracted: [],
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        }
                      }]
                    }
                    
                    updatedCandidateForParent = updatedCandidate
                  }
                  return updatedCandidate
                }
                return candidate
              })
            )

            // Queue the update for parent notification
            if (updatedCandidateForParent) {
              setPendingUpdates(prev => [...prev, updatedCandidateForParent!])
            }

            // Remove from evaluating set
            setEvaluatingCandidates(prev => {
              const newSet = new Set(prev)
              newSet.delete(candidateId)
              return newSet
            })
          }
        }
      )

      console.log(`✅ Batch resume evaluation completed successfully`)

    } catch (error) {
      console.error(`❌ Batch resume evaluation failed:`, error)
      
      // Clear evaluating state for all candidates on error
      setEvaluatingCandidates(new Set())
      
      // Reset batch progress
      setBatchEvaluationProgress({
        completed: 0,
        total: 0,
        isActive: false
      })
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleSort = (field: string) => {
    const newOrder = sortOrder[field] === 'asc' ? 'desc' : 'asc'
    setSortOrder({ ...sortOrder, [field]: newOrder })
    
    const sorted = [...localCandidates].sort((a, b) => {
      let aVal, bVal
      
      switch (field) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'email':
          aVal = a.email.toLowerCase()
          bVal = b.email.toLowerCase()
          break
        case 'status':
          aVal = getCandidateRoundStatus(a)
          bVal = getCandidateRoundStatus(b)
          break
        default:
          return 0
      }
      
      if (newOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
    
    setLocalCandidates(sorted)
  }

  const getCandidateRoundStatus = (candidate: RoundCandidate): RoundStatus => {
    return candidate.round_status as RoundStatus || 'action_pending'
  }

  const getCustomFieldValue = (candidate: RoundCandidate, fieldId: string) => {
    const customValue = candidate.custom_field_values?.find(
      cv => cv.field_definition_id === fieldId
    )
    return customValue?.field_value || '-'
  }

  const getCandidateScore = (candidate: RoundCandidate): string => {
    // For screening rounds, check for resume score
    if (candidate.resume_evaluation_result?.overall_percentage_score !== undefined && candidate.resume_evaluation_result?.overall_percentage_score !== null) {
      return `${Math.round(candidate.resume_evaluation_result.overall_percentage_score)}%`
    }
    
    // Fallback to regular evaluation score
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      const evaluation = candidate.candidate_rounds[0].evaluations?.[0]
      if (evaluation?.evaluation_result?.overall_percentage_score !== undefined && evaluation?.evaluation_result?.overall_percentage_score !== null) {
        return `${Math.round(evaluation.evaluation_result.overall_percentage_score)}%`
      }
    }
    return '-'
  }

  const openEvaluationPanel = (candidate: RoundCandidate) => {
    setSelectedCandidate(candidate)
    setIsPanelOpen(true)
  }

  const closeEvaluationPanel = () => {
    setSelectedCandidate(null)
    setIsPanelOpen(false)
  }

  const handleStatusChange = (candidateId: string, status: RoundStatus) => {
    onStatusChange(candidateId, status)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (localCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          No candidates found
        </h3>
        <p className="text-gray-500" style={{ fontFamily }}>
          No candidates have been added to this screening round yet.
        </p>
      </div>
    )
  }

  return (
    <>
      <div 
        className="w-full"
        style={{ 
          fontFamily,
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          overflow: "hidden"
        }}
      >
        {/* Table Header */}
        <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead
            style={{
              backgroundColor: "#f6f7f8",
              borderRadius: "8px",
              position: "sticky",
              top: 0,
              zIndex: 11
            }}
          >
            <tr>
              <th
                style={{
                  background: "#f6f7f8",
                  borderBottom: "none",
                  height: "48px",
                  fontSize: "12px",
                  color: "#6B7280",
                  padding: "8px 16px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  fontFamily,
                  textAlign: "left",
                  minWidth: "220px",
                  position: "sticky",
                  left: 0,
                  zIndex: 12
                }}
              >
                <div className="flex items-center gap-2">
                  Candidate
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSort('name')}
                  >
                    {sortOrder.name === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </th>
              <th
                style={{
                  background: "#f6f7f8",
                  borderBottom: "none",
                  height: "48px",
                  fontSize: "12px",
                  color: "#6B7280",
                  padding: "8px 16px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  minWidth: "200px"
                }}
              >
                <div className="flex items-center gap-2">
                  Email
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSort('email')}
                  >
                    {sortOrder.email === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </th>
              <th
                style={{
                  background: "#f6f7f8",
                  borderBottom: "none",
                  height: "48px",
                  fontSize: "12px",
                  color: "#6B7280",
                  padding: "8px 16px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  minWidth: "180px"
                }}
              >
                <div className="flex items-center gap-2">
                  Status
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSort('status')}
                  >
                    {sortOrder.status === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </th>
              {roundInfo?.round_type === 'SCREENING' && (
                <th
                  style={{
                    background: "#f6f7f8",
                    borderBottom: "none",
                    height: "48px",
                    fontSize: "12px",
                    color: "#6B7280",
                    padding: "8px 16px",
                    fontWeight: "500",
                    verticalAlign: "center",
                    fontFamily,
                    textAlign: "left",
                    minWidth: "120px"
                  }}
                >
                  Resume Score
                </th>
              )}
              <th
                style={{
                  background: "#f6f7f8",
                  borderBottom: "none",
                  height: "48px",
                  fontSize: "12px",
                  color: "#6B7280",
                  padding: "8px 16px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  minWidth: "140px"
                }}
              >
                Contact
              </th>
              {/* Custom Fields */}
              {customFieldDefinitions.map((field, index) => (
                <th
                  key={field.id}
                  style={{
                    background: "#f6f7f8",
                    borderBottom: "none",
                    height: "48px",
                    fontSize: "12px",
                    color: "#6B7280",
                    padding: "8px 16px",
                    fontWeight: "500",
                    verticalAlign: "center",
                    fontFamily,
                    textAlign: "left",
                    minWidth: "260px",
                    ...(index === customFieldDefinitions.length - 1 && !roundInfo?.round_type === 'SCREENING' && {
                      borderTopRightRadius: "8px",
                      borderBottomRightRadius: "8px"
                    })
                  }}
                >
                  {field.field_label}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody
            style={{
              maxHeight: "calc(100vh - 154px - 32px - 47px - 14px)",
              position: "relative",
              height: "100%"
            }}
          >
            {localCandidates.map((candidate) => {
              const status = getCandidateRoundStatus(candidate)
              const statusConfig = ROUND_STATUS_CONFIG[status]
              const score = getCandidateScore(candidate)
              
              return (
                <tr
                  key={candidate.id}
                  onClick={() => openEvaluationPanel(candidate)}
                  style={{
                    cursor: "pointer"
                  }}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  {/* Candidate Info - Sticky */}
                  <td
                    style={{
                      minWidth: "220px",
                      position: "sticky",
                      left: 0,
                      zIndex: 10,
                      padding: "12px"
                    }}
                    className="bg-white group-hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ fontFamily }}>
                          {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="text-sm font-medium text-gray-900 truncate"
                                style={{ 
                                  fontFamily,
                                  maxWidth: "140px"
                                }}
                              >
                                {candidate.name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{candidate.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ minWidth: "200px", padding: "12px" }}>
                    <div 
                      className="text-sm font-medium text-gray-900"
                      style={{ fontFamily }}
                    >
                      {truncateText(candidate.email, 25)}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ minWidth: "180px", padding: "12px" }}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 h-8 px-3 rounded-full"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                            borderColor: statusConfig.color,
                            fontFamily
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <statusConfig.icon className="w-3 h-3" />
                          <span className="text-xs font-medium">{statusConfig.label}</span>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {Object.entries(ROUND_STATUS_CONFIG).map(([status, config]) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusChange(candidate.id, status as RoundStatus)
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <config.icon 
                              className="w-3 h-3" 
                              style={{ color: config.color }}
                            />
                            <span style={{ fontFamily }}>{config.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Resume Score (only for SCREENING) */}
                  {roundInfo?.round_type === 'SCREENING' && (
                    <td style={{ minWidth: "120px", padding: "12px" }}>
                      <div className="flex items-center justify-center">
                        {evaluatingCandidates.has(candidate.id) ? (
                          // Show loader while evaluating
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border-2 border-blue-200">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-xs text-blue-600" style={{ fontFamily }}>
                              Evaluating...
                            </span>
                          </div>
                        ) : score !== '-' ? (
                          <div className="flex items-center">
                            <div
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: (() => {
                                  const numScore = parseInt(score.replace('%', ''))
                                  if (numScore >= 80) return '#DCFCE7' // green-100
                                  if (numScore >= 60) return '#FEF3C7' // yellow-100  
                                  if (numScore >= 40) return '#FED7AA' // orange-100
                                  return '#FEE2E2' // red-100
                                })(),
                                color: (() => {
                                  const numScore = parseInt(score.replace('%', ''))
                                  if (numScore >= 80) return '#16A34A' // green-600
                                  if (numScore >= 60) return '#D97706' // yellow-600
                                  if (numScore >= 40) return '#EA580C' // orange-600
                                  return '#DC2626' // red-600
                                })(),
                                fontFamily
                              }}
                            >
                              {score}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="text-sm text-gray-400"
                            style={{ fontFamily }}
                          >
                            -
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Contact */}
                  <td style={{ minWidth: "140px", padding: "12px" }}>
                    <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily }}>
                      <Phone className="w-3 h-3" />
                      {candidate.mobile_phone || '-'}
                    </div>
                  </td>

                  {/* Custom Fields */}
                  {customFieldDefinitions.map((field) => (
                    <td key={field.id} style={{ minWidth: "260px", padding: "16px" }}>
                      <div 
                        className="text-sm text-gray-600"
                        style={{ fontFamily }}
                      >
                        {getCustomFieldValue(candidate, field.id)}
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Candidate Evaluation Panel */}
      {selectedCandidate && isPanelOpen && (
        <CandidateEvaluationPanel
          candidate={selectedCandidate}
          isOpen={isPanelOpen}
          onClose={closeEvaluationPanel}
          roundType={roundInfo?.round_type || 'SCREENING'}
          isEvaluating={selectedCandidate ? evaluatingCandidates.has(selectedCandidate.id) : false}
          onCandidateUpdated={(updatedCandidate) => {
            setLocalCandidates(prev =>
              prev.map(candidate =>
                candidate.id === updatedCandidate.id ? updatedCandidate : candidate
              )
            )
            onCandidateUpdated(updatedCandidate)
          }}
        />
      )}
    </>
  )
}
