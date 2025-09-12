"use client"

import React, { useState, useEffect } from "react"
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

interface ModernInterviewCandidatesTableProps {
  candidates: RoundCandidate[]
  customFieldDefinitions: CustomFieldDefinition[]
  isLoading?: boolean
  roundInfo?: any
  jobOpeningId?: string
  onStatusChange?: (candidateId: string, newStatus: RoundStatus) => void
  onCandidateUpdated?: (candidate: RoundCandidate) => void
  sparrowRoundId?: string
  currentRoundName?: string
  candidateReEvaluationStates?: Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>
  onReEvaluationStateChange?: (candidateId: string, state: any) => void
}

const sortingOptions = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "created_at", label: "Date Added" },
  { value: "status", label: "Status" }
]

export function ModernInterviewCandidatesTable({ 
  candidates, 
  customFieldDefinitions, 
  isLoading = false,
  roundInfo,
  jobOpeningId,
  onStatusChange = () => {},
  onCandidateUpdated = () => {},
  sparrowRoundId,
  currentRoundName,
  candidateReEvaluationStates = {},
  onReEvaluationStateChange = () => {}
}: ModernInterviewCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const { isMultiJobMode } = useMultiJobContextSafe()
  
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>(candidates)
  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<{ [key: string]: 'asc' | 'desc' }>({
    name: 'asc',
    email: 'asc',
    created_at: 'desc',
    status: 'asc'
  })

  // Update local candidates when prop changes
  useEffect(() => {
    setLocalCandidates(candidates)
  }, [candidates])

  const getCandidateRoundStatus = (candidate: RoundCandidate): RoundStatus => {
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      return candidate.candidate_rounds[0].status as RoundStatus
    }
    return candidate.round_status as RoundStatus
  }

  const getCustomFieldValue = (candidate: RoundCandidate, fieldId: string) => {
    const customValue = candidate.custom_field_values.find(
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
    setIsPanelOpen(false)
    setSelectedCandidate(null)
  }

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    // Update local candidates
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
    
    // Update selected candidate if it's currently open in panel
    if (selectedCandidate && selectedCandidate.id === candidateId) {
      const updatedCandidate = { ...selectedCandidate }
      if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
        updatedCandidate.candidate_rounds[0].status = newStatus
      } else {
        updatedCandidate.round_status = newStatus
      }
      setSelectedCandidate(updatedCandidate)
    }

    onStatusChange(candidateId, newStatus)
  }

  const handleSort = (column: string) => {
    const currentOrder = sortOrder[column]
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc'
    
    setSortOrder(prev => ({
      ...prev,
      [column]: newOrder
    }))

    // Sort candidates locally
    const sorted = [...localCandidates].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (column) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'status':
          aValue = getCandidateRoundStatus(a)
          bValue = getCandidateRoundStatus(b)
          break
        default:
          return 0
      }

      if (newOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setLocalCandidates(sorted)
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 300px)" }}>
        <Spinner />
      </div>
    )
  }

  if (localCandidates.length === 0) {
    return (
      <div className="flex items-center justify-center flex-col" style={{ height: "calc(100vh - 300px)" }}>
        <Users className="w-12 h-12 text-gray-400 mb-4" />
        <div className="text-gray-500 mb-2" style={{ fontFamily }}>
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
      <div style={{ height: `calc(100vh - 262px)`, overflow: "auto", maxHeight: "600px" }}>
        <table 
          style={{ 
            position: "relative",
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0
          }}
        >
          {/* Sticky Header */}
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 11,
              borderRadius: "8px"
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
                Score
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

                  {/* Score with Color Coding */}
                  <td style={{ minWidth: "120px", padding: "12px" }}>
                    {score !== '-' ? (
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

      {/* Evaluation Panel */}
      <CandidateEvaluationPanel
        candidate={selectedCandidate}
        isOpen={isPanelOpen}
        onClose={closeEvaluationPanel}
        roundType="INTERVIEW"
        onStatusChange={handleStatusChange}
        isEvaluating={false}
        candidateReEvaluationStates={candidateReEvaluationStates}
        onReEvaluationStateChange={onReEvaluationStateChange}
        sparrowRoundId={sparrowRoundId}
        currentRoundName={currentRoundName || 'Interview Round'}
        onCandidateUpdated={(updatedCandidate) => {
          setLocalCandidates(prev => 
            prev.map(candidate => 
              candidate.id === updatedCandidate.id ? updatedCandidate : candidate
            )
          )
          if (selectedCandidate && selectedCandidate.id === updatedCandidate.id) {
            setSelectedCandidate(updatedCandidate)
          }
          onCandidateUpdated(updatedCandidate)
        }}
      />
    </>
  )
}
