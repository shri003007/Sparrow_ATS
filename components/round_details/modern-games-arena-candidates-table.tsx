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
  Clock3,
  Check,
  X
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { RoundCandidate, CustomFieldDefinition } from "@/lib/round-candidate-types"
import { CandidateEvaluationPanel } from "./candidate-evaluation-panel"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"

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

interface ModernGamesArenaCandidatesTableProps {
  candidates: RoundCandidate[]
  customFieldDefinitions: CustomFieldDefinition[]
  isLoading?: boolean
  roundInfo?: any
  jobOpeningId?: string
  onStatusChange: (candidateId: string, status: RoundStatus) => void
  onCandidateUpdated?: (candidate: RoundCandidate) => void
  sparrowRoundId?: string
  currentRoundName?: string
  candidateReEvaluationStates?: Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>
  onReEvaluationStateChange?: (candidateId: string, state: {
    isReEvaluating?: boolean
    reEvaluationError?: string | null
    showReEvaluationOptions?: boolean
  }) => void
}

export function ModernGamesArenaCandidatesTable({
  candidates,
  customFieldDefinitions,
  isLoading = false,
  roundInfo,
  jobOpeningId,
  onStatusChange,
  onCandidateUpdated = () => {},
  sparrowRoundId = '',
  currentRoundName = 'Games Arena Round',
  candidateReEvaluationStates = {},
  onReEvaluationStateChange = () => {}
}: ModernGamesArenaCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const { isMultiJobMode } = useMultiJobContextSafe()

  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({})
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>(candidates)

  // Update local candidates when prop changes
  React.useEffect(() => {
    setLocalCandidates(candidates)
  }, [candidates])

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
    // Get status from candidate_rounds[0].status (API source) with fallback to round_status
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      return candidate.candidate_rounds[0].status as RoundStatus || 'action_pending'
    }
    return candidate.round_status as RoundStatus || 'action_pending'
  }

  const getCustomFieldValue = (candidate: RoundCandidate, fieldId: string) => {
    const customValue = candidate.custom_field_values?.find(
      cv => cv.field_definition_id === fieldId
    )
    return customValue?.field_value || '-'
  }

  const getCandidateScore = (candidate: RoundCandidate): string => {
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
    // Update local candidates state immediately for UI responsiveness
    setLocalCandidates(prevCandidates => 
      prevCandidates.map(candidate => {
        if (candidate.id === candidateId) {
          const updatedCandidate = { ...candidate }
          if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
            updatedCandidate.candidate_rounds[0].status = status
          } else {
            updatedCandidate.round_status = status
          }
          return updatedCandidate
        }
        return candidate
      })
    )
    
    // Update selected candidate if it's currently open in panel
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      const updatedCandidate = { ...selectedCandidate }
      if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
        updatedCandidate.candidate_rounds[0].status = status
      } else {
        updatedCandidate.round_status = status
      }
      setSelectedCandidate(updatedCandidate)
    }

    // Notify parent component
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
          No candidates have been added to this games arena round yet.
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
          overflow: "hidden",
          maxHeight: "600px",
          overflowY: "auto"
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
              
              {/* Job Column - Only show in multi-job mode */}
              {isMultiJobMode && (
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
                    Job
                  </div>
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
                Evaluation
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
                    ...(index === customFieldDefinitions.length - 1 && {
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

                  {/* Job Column - Only show in multi-job mode */}
                  {isMultiJobMode && (
                    <td style={{ minWidth: "200px", padding: "12px" }}>
                      <div 
                        className="text-sm font-medium text-gray-900"
                        style={{ fontFamily }}
                      >
                        {(candidate as any).jobTitle || 'Unknown Job'}
                      </div>
                    </td>
                  )}

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

                  {/* Evaluation Status */}
                  <td style={{ minWidth: "120px", padding: "12px" }}>
                    <div className="flex items-center">
                      {candidate.candidate_rounds?.[0]?.is_evaluation ? (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium" style={{ fontFamily }}>
                            Evaluated
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400" style={{ fontFamily }}>
                            Pending
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

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
          roundType={roundInfo?.round_type || 'GAMES_ARENA'}
          onStatusChange={handleStatusChange}
          onCandidateUpdated={(updatedCandidate) => {
            setLocalCandidates(prev =>
              prev.map(candidate =>
                candidate.id === updatedCandidate.id ? updatedCandidate : candidate
              )
            )
            onCandidateUpdated(updatedCandidate)
          }}
          sparrowRoundId={sparrowRoundId}
          currentRoundName={currentRoundName}
          candidateReEvaluationStates={candidateReEvaluationStates}
          onReEvaluationStateChange={onReEvaluationStateChange}
        />
      )}
    </>
  )
}
