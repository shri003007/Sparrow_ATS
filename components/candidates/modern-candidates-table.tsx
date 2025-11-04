"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  ChevronDown, 
  ChevronUp, 
  Users,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Clock3,
  Search,
  Download,
  FileSpreadsheet
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
  onCandidateClick?: (candidate: CandidateDisplay) => void
  isLoading?: boolean
}

export function ModernCandidatesTable({ 
  candidates, 
  onStatusChange, 
  hasRoundsStarted = false, 
  onCandidateClick, 
  isLoading = false
}: ModernCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({
    score: 'desc' // Default to descending for scores (highest first)
  })
  const [localCandidates, setLocalCandidates] = useState<CandidateDisplay[]>(candidates)
  const [searchQuery, setSearchQuery] = useState("")

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
          // Handle round-specific sorting
          if (field.startsWith('round-')) {
            const roundOrder = parseInt(field.replace('round-', ''))
            aVal = getRoundScore(a, roundOrder) ?? -1
            bVal = getRoundScore(b, roundOrder) ?? -1
          } else {
            return 0
          }
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

  // Filter candidates based on search query
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) {
      return localCandidates
    }
    
    const query = searchQuery.toLowerCase().trim()
    return localCandidates.filter(candidate => 
      candidate.name.toLowerCase().includes(query) ||
      candidate.email.toLowerCase().includes(query)
    )
  }, [localCandidates, searchQuery])

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

  const handleExport = (format: 'excel' | 'pdf') => {
    console.log(`Exporting ${filteredCandidates.length} candidates as ${format}`)
    
    if (format === 'excel') {
      // Excel export logic - only include columns visible in the table
      const headers = ['Name', 'Email', 'Status']
      
      // Add score columns ONLY if rounds have started (matching table visibility)
      if (hasRoundsStarted) {
        headers.push('Overall Score')
        // Add each round column (matching table visibility)
        rounds.forEach(round => headers.push(round.round_name))
      }
      
      // Add custom fields ONLY if rounds have started (matching table visibility)
      if (hasRoundsStarted) {
        customFields.forEach(field => headers.push(field.field_label))
      }
      
      // Build CSV content - wrap all headers in quotes to handle special characters
      let csvContent = headers.map(h => `"${h}"`).join(',') + '\n'
      
      filteredCandidates.forEach(candidate => {
        const row = [
          `"${candidate.name}"`,
          `"${candidate.email}"`,
          `"${STATUS_CONFIG[candidate.status].label}"`
        ]
        
        // Add score data ONLY if rounds have started
        if (hasRoundsStarted) {
          // Overall score
          row.push(candidate.overall_score !== null && candidate.overall_score !== undefined ? candidate.overall_score.toString() : '-')
          
          // Individual round scores
          rounds.forEach(round => {
            const score = getRoundScore(candidate, round.order)
            row.push(score !== null && score !== undefined ? score.toString() : '-')
          })
          
          // Custom field values
          customFields.forEach(field => {
            const value = getCustomFieldValue(candidate, field.field_name)
            row.push(`"${value}"`)
          })
        }
        
        csvContent += row.join(',') + '\n'
      })
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!isLoading && localCandidates.length === 0) {
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
        overflow: "hidden",
        height: "calc(100vh - 160px)", // Fixed height based on viewport with maximum available space
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Search Bar and Export */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
            style={{ fontFamily }}
          />
        </div>
        
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 cursor-pointer"
              style={{ fontFamily }}
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>Export as Excel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* No search results state */}
      {searchQuery.trim() && filteredCandidates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
            No candidates found
          </h3>
          <p className="text-gray-500" style={{ fontFamily }}>
            No candidates match your search for "{searchQuery}". Try a different search term.
          </p>
        </div>
      ) : (
        // Horizontal Scroll Container
        <div 
          className="flex-1 overflow-auto"
        style={{
          maxWidth: "100%",
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E0 #F7FAFC",
          paddingBottom: "60px" // Add substantial bottom padding to ensure last row is fully visible
        }}
      >
        {/* Table Header */}
        <table 
          className="w-full" 
          style={{ 
            borderCollapse: "separate", 
            borderSpacing: "0 0",
            minWidth: "1200px", // Ensure minimum width to force horizontal scroll when needed
            marginBottom: "40px" // Extra margin to ensure last row is fully visible
          }}
        >
        <thead
          style={{
            backgroundColor: "#f6f7f8",
            borderRadius: "8px",
            position: "sticky",
            top: 0,
            zIndex: 20
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
                padding: "8px 20px",
                fontWeight: "500",
                verticalAlign: "center",
                borderTopLeftRadius: "8px",
                borderBottomLeftRadius: "8px",
                fontFamily,
                textAlign: "left",
                width: "220px",
                minWidth: "220px",
                maxWidth: "220px",
                position: "sticky",
                left: 0,
                zIndex: 30
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
                padding: "8px 20px",
                fontWeight: "500",
                verticalAlign: "center",
                fontFamily,
                textAlign: "left",
                width: "200px",
                minWidth: "200px",
                maxWidth: "200px"
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
                padding: "8px 20px",
                fontWeight: "500",
                verticalAlign: "center",
                fontFamily,
                textAlign: "left",
                width: "160px",
                minWidth: "160px",
                maxWidth: "160px"
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
                  padding: "8px 20px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  width: "140px",
                  minWidth: "140px",
                  maxWidth: "140px",
                  whiteSpace: "nowrap"
                }}
              >
                <div className="flex items-center gap-2" style={{ whiteSpace: "nowrap" }}>
                  Overall Score
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
                  padding: "8px 20px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  width: "140px",
                  minWidth: "140px",
                  maxWidth: "140px"
                }}
              >
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "80px", // Account for padding and sort button
                            cursor: "help"
                          }}
                        >
                          {round.round_name}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{round.round_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleSort(`round-${round.order}`)}
                  >
                    {sortOrder[`round-${round.order}`] === 'asc' ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </th>
            ))}
            <th
              style={{
                background: "#f6f7f8",
                borderBottom: "none",
                height: "48px",
                fontSize: "12px",
                color: "#6B7280",
                padding: "8px 20px",
                fontWeight: "500",
                verticalAlign: "center",
                fontFamily,
                textAlign: "left",
                width: "140px",
                minWidth: "140px",
                maxWidth: "140px"
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
                  padding: "8px 20px",
                  fontWeight: "500",
                  verticalAlign: "center",
                  fontFamily,
                  textAlign: "left",
                  width: "200px",
                  minWidth: "200px",
                  maxWidth: "200px",
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
        <tbody>
          {filteredCandidates.map((candidate) => {
            const statusConfig = STATUS_CONFIG[candidate.status]
            
            return (
              <tr
                key={candidate.id}
                className="hover:bg-gray-50 transition-colors group"
              >
                {/* Candidate Info - Sticky */}
                <td
                  style={{
                    width: "220px",
                    minWidth: "220px",
                    maxWidth: "220px",
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    padding: "12px 20px"
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
                              className={`text-sm font-medium text-gray-900 truncate ${onCandidateClick ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                              style={{ 
                                fontFamily,
                                maxWidth: "140px"
                              }}
                              onClick={(e) => {
                                if (onCandidateClick) {
                                  e.stopPropagation()
                                  onCandidateClick(candidate)
                                }
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
                <td style={{ width: "200px", minWidth: "200px", maxWidth: "200px", padding: "12px 20px" }}>
                  <div 
                    className="text-sm font-medium text-gray-900"
                    style={{ fontFamily }}
                  >
                    {truncateText(candidate.email, 25)}
                  </div>
                </td>

                {/* Status */}
                <td style={{ width: "160px", minWidth: "160px", maxWidth: "160px", padding: "12px 20px" }}>
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
                  <td style={{ width: "140px", minWidth: "140px", maxWidth: "140px", padding: "12px 20px" }}>
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
                  <td key={`round-${round.order}`} style={{ width: "140px", minWidth: "140px", maxWidth: "140px", padding: "12px 20px" }}>
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
                <td style={{ width: "140px", minWidth: "140px", maxWidth: "140px", padding: "12px 20px" }}>
                  <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily }}>
                    <Phone className="w-3 h-3" />
                    {candidate.mobile_phone || '-'}
                  </div>
                </td>

                {/* Custom Fields */}
                {customFields.map((field) => (
                  <td key={field.field_name} style={{ width: "200px", minWidth: "200px", maxWidth: "200px", padding: "12px 20px" }}>
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
      )}
    </div>
  )
}
