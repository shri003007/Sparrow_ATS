"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  ChevronDown, 
  ChevronUp, 
  Users,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Clock3
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"

const STATUS_CONFIG = {
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

interface ModernCandidatesTableProps {
  candidates: CandidateDisplay[]
  onStatusChange: (candidateId: string, newStatus: CandidateUIStatus) => void
  hasRoundsStarted?: boolean
}

export function ModernCandidatesTable({ candidates, onStatusChange, hasRoundsStarted = false }: ModernCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({
    score: 'desc' // Default to descending for scores (highest first)
  })
  const [localCandidates, setLocalCandidates] = useState<CandidateDisplay[]>(candidates)

  // Update local candidates when prop changes and sort by score by default when rounds started
  React.useEffect(() => {
    if (hasRoundsStarted && candidates.length > 0) {
      // Sort by score in descending order by default (highest scores first)
      const sortedCandidates = [...candidates].sort((a, b) => {
        const aScore = a.overall_score ?? -1
        const bScore = b.overall_score ?? -1
        return bScore - aScore // Descending order
      })
      setLocalCandidates(sortedCandidates)
    } else {
      setLocalCandidates(candidates)
    }
  }, [candidates, hasRoundsStarted])

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
          aVal = a.status
          bVal = b.status
          break
        case 'score':
          aVal = a.overall_score ?? -1
          bVal = b.overall_score ?? -1
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

  const getCustomFieldValue = (candidate: CandidateDisplay, fieldName: string) => {
    const customValue = candidate.custom_field_values?.find(
      cfv => cfv.field_definition?.field_name === fieldName
    )
    return customValue?.field_value || '-'
  }

  // Extract unique rounds from all candidates based on order
  const rounds = useMemo(() => {
    const roundMap = new Map<number, { round_name: string; order: number }>()
    
    localCandidates.forEach(candidate => {
      if (candidate.overall_evaluation?.round_scores) {
        Object.values(candidate.overall_evaluation.round_scores).forEach(roundScore => {
          if (roundScore && typeof roundScore === 'object' && 'order' in roundScore && 'round_name' in roundScore) {
            const order = Math.floor(roundScore.order) // Use floor to handle decimal orders
            if (!roundMap.has(order) || !roundMap.get(order)?.round_name) {
              roundMap.set(order, {
                round_name: roundScore.round_name || `Round ${order}`,
                order
              })
            }
          }
        })
      }
    })
    
    // Sort by order
    return Array.from(roundMap.values()).sort((a, b) => a.order - b.order)
  }, [localCandidates])

  // Get round score for a specific candidate and order
  const getRoundScore = (candidate: CandidateDisplay, order: number) => {
    if (!candidate.overall_evaluation?.round_scores) return null
    
    const roundScore = Object.values(candidate.overall_evaluation.round_scores).find(
      score => score && typeof score === 'object' && 'order' in score && Math.floor(score.order) === order
    )
    
    return roundScore && 'score' in roundScore ? roundScore.score : null
  }

  // Extract unique custom fields from candidates
  const customFields = useMemo(() => {
    const fieldMap = new Map<string, { field_name: string; field_label: string; field_type: string }>()
    
    localCandidates.forEach(candidate => {
      candidate.custom_field_values?.forEach(cfv => {
        if (cfv.field_definition) {
          fieldMap.set(cfv.field_definition.field_name, {
            field_name: cfv.field_definition.field_name,
            field_label: cfv.field_definition.field_label,
            field_type: cfv.field_definition.field_type
          })
        }
      })
    })
    
    return Array.from(fieldMap.values())
  }, [localCandidates])

  const handleStatusChange = (candidateId: string, status: CandidateUIStatus) => {
    // Update local state immediately for UI responsiveness
    setLocalCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, status }
          : candidate
      )
    )
    
    // Call parent handler
    onStatusChange(candidateId, status)
  }

  if (localCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          No candidates found
        </h3>
        <p className="text-gray-500" style={{ fontFamily }}>
          No candidates have been added to this job yet.
        </p>
      </div>
    )
  }

  return (
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
                zIndex: 40
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
            {/* Score Column - Only show when rounds have started */}
            {hasRoundsStarted && (
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
                <div className="flex items-center gap-2">
                  Score
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSort('score')}
                  >
                    {sortOrder.score === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </th>
            )}
            {/* Round Score Columns - Only show when rounds have started */}
            {hasRoundsStarted && rounds.map((round) => (
              <th
                key={`round-${round.order}`}
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
                {round.round_name}
              </th>
            ))}
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
            {customFields.map((field, index) => (
              <th
                key={field.field_name}
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
                  ...(index === customFields.length - 1 && {
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
            const statusConfig = STATUS_CONFIG[candidate.status]
            
            return (
              <tr
                key={candidate.id}
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
                      >
                        <statusConfig.icon className="w-3 h-3" />
                        <span className="text-xs font-medium">{statusConfig.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(candidate.id, status as CandidateUIStatus)}
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

                {/* Score - Only show when rounds have started */}
                {hasRoundsStarted && (
                  <td style={{ minWidth: "120px", padding: "12px" }}>
                    {candidate.overall_score !== undefined && candidate.overall_score !== null ? (
                      <div className="flex items-center">
                        <div
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: (() => {
                              const score = candidate.overall_score
                              if (score >= 80) return '#DCFCE7' // green-100
                              if (score >= 60) return '#FEF3C7' // yellow-100  
                              if (score >= 40) return '#FED7AA' // orange-100
                              return '#FEE2E2' // red-100
                            })(),
                            color: (() => {
                              const score = candidate.overall_score
                              if (score >= 80) return '#16A34A' // green-600
                              if (score >= 60) return '#D97706' // yellow-600
                              if (score >= 40) return '#EA580C' // orange-600
                              return '#DC2626' // red-600
                            })(),
                            fontFamily
                          }}
                        >
                          {Math.round(candidate.overall_score)}%
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
                )}

                {/* Round Scores - Only show when rounds have started */}
                {hasRoundsStarted && rounds.map((round) => (
                  <td key={`round-${round.order}`} style={{ minWidth: "120px", padding: "12px" }}>
                    {(() => {
                      const score = getRoundScore(candidate, round.order)
                      if (score !== null && score !== undefined) {
                        return (
                          <div className="flex items-center">
                            <div
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: (() => {
                                  if (score >= 80) return '#DCFCE7' // green-100
                                  if (score >= 60) return '#FEF3C7' // yellow-100  
                                  if (score >= 40) return '#FED7AA' // orange-100
                                  return '#FEE2E2' // red-100
                                })(),
                                color: (() => {
                                  if (score >= 80) return '#16A34A' // green-600
                                  if (score >= 60) return '#D97706' // yellow-600
                                  if (score >= 40) return '#EA580C' // orange-600
                                  return '#DC2626' // red-600
                                })(),
                                fontFamily
                              }}
                            >
                              {Math.round(score)}%
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div 
                            className="text-sm text-gray-400"
                            style={{ fontFamily }}
                          >
                            -
                          </div>
                        )
                      }
                    })()}
                  </td>
                ))}

                {/* Contact */}
                <td style={{ minWidth: "140px", padding: "12px" }}>
                  <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily }}>
                    <Phone className="w-3 h-3" />
                    {candidate.mobile_phone || '-'}
                  </div>
                </td>

                {/* Custom Fields */}
                {customFields.map((field) => (
                  <td key={field.field_name} style={{ minWidth: "260px", padding: "16px" }}>
                    <div 
                      className="text-sm text-gray-600"
                      style={{ fontFamily }}
                    >
                      {getCustomFieldValue(candidate, field.field_name)}
                    </div>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
