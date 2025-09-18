"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  ChevronDown, 
  ChevronUp, 
  Users,
  Phone,
  Loader2
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"
import type { JobOpeningListItem } from "@/lib/job-types"
import { CandidatesApi } from "@/lib/api/candidates"


interface CandidateWithJob extends CandidateDisplay {
  job_name: string
  job_id: string
  overall_evaluation?: {
    round_scores: Record<string, {
      order: number
      score: number
      round_name: string
      round_type: string
    }>
    overall_score: number
    total_possible_score?: number
  }
}

interface AllViewsCandidatesTableProps {
  selectedJobs: JobOpeningListItem[]
  onStatusChange: (candidateId: string, newStatus: CandidateUIStatus) => void
  hasRoundsStarted?: boolean
  viewId?: string
}

export function AllViewsCandidatesTable({ 
  selectedJobs, 
  onStatusChange, 
  hasRoundsStarted = false,
  viewId
}: AllViewsCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({
    score: 'desc' // Default to descending for scores (highest first)
  })
  const [candidates, setCandidates] = useState<CandidateWithJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ completed: 0, total: 0 })
  
  // Track previous viewId to detect actual view changes
  const previousViewIdRef = useRef<string | null>(null)
  
  // Clear cache only when truly switching views (not during development/HMR)
  useEffect(() => {
    // Only clear cache when viewId actually changes (not on initial mount or HMR)
    if (previousViewIdRef.current && previousViewIdRef.current !== viewId) {
      console.log('🧹 [CACHE CLEANUP] View changed, clearing candidates cache')
      
      // Clear candidates cache when switching between different views
      CandidatesApi.clearCache()
    }
    
    previousViewIdRef.current = viewId || null
  }, [viewId])

  // Helper function to fetch candidates for a single job (caching handled at API level)
  const fetchJobCandidates = async (job: JobOpeningListItem): Promise<CandidateWithJob[]> => {
    try {
      const response = await CandidatesApi.getCandidatesByJob(job.id)
      
      // Add job information to each candidate and ensure valid status
      const jobName = job.posting_title || (job as any).title || (job as any).job_title || (job as any).name || 'Unknown Job'
      
      const candidatesWithJob = response.candidates.map(candidate => {
        const overallScore = candidate.overall_evaluation?.overall_score || undefined
        
        return {
          ...candidate,
          job_name: jobName,
          job_id: job.id,
          status: 'action_pending' as CandidateUIStatus, // Default status since we're not showing it
          // Transform API fields to display fields
          experience_display: `${candidate.experience_years || 0} yrs ${candidate.experience_months || 0} mos`,
          current_salary_display: `${candidate.current_salary || 0} ${candidate.current_salary_currency || 'USD'}`,
          expected_salary_display: `${candidate.expected_salary || 0} ${candidate.expected_salary_currency || 'USD'}`,
          available_to_join_display: `${candidate.available_to_join_days || 0} days`,
          source: null,
          notes: null,
          // Extract overall score from nested structure
          overall_score: overallScore,
          // Preserve overall_evaluation for round scores
          overall_evaluation: candidate.overall_evaluation
        }
      })
      
      return candidatesWithJob
    } catch (error) {
      console.error(`Failed to fetch candidates for job ${job.posting_title || 'Unknown Job'}:`, error)
      return []
    }
  }

  // Fetch candidates from all selected jobs
  useEffect(() => {
    const fetchAllCandidates = async () => {
      if (selectedJobs.length === 0) {
        setCandidates([])
        return
      }

      console.log('🔍 [ALL VIEWS CANDIDATES] Selected jobs:', selectedJobs.map(j => ({ id: j.id, posting_title: j.posting_title })))

      setIsLoading(true)
      setLoadingProgress({ completed: 0, total: selectedJobs.length })
      
      try {
        // Fetch all jobs in parallel
        const jobPromises = selectedJobs.map(async (job, index) => {
          const candidates = await fetchJobCandidates(job)
          
          // Update progress as each job completes
          setLoadingProgress(prev => ({ ...prev, completed: prev.completed + 1 }))
          
          return candidates
        })

        // Wait for all parallel requests to complete
        const allJobCandidates = await Promise.all(jobPromises)
        
        // Flatten all candidates into a single array
        const allCandidates = allJobCandidates.flat()

        // Sort by score by default when rounds started (descending order - highest first)
        if (hasRoundsStarted && allCandidates.length > 0) {
          allCandidates.sort((a, b) => {
            const aScore = a.overall_score ?? -1
            const bScore = b.overall_score ?? -1
            return bScore - aScore // Descending order
          })
        }

        setCandidates(allCandidates)
        console.log(`🔍 [ALL VIEWS CANDIDATES] Loaded ${allCandidates.length} candidates from ${selectedJobs.length} jobs`)
      } catch (error) {
        console.error('Error fetching candidates:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllCandidates()
  }, [selectedJobs, hasRoundsStarted])

  const truncateText = (text: string | undefined | null, maxLength: number) => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleSort = (field: string) => {
    const newOrder = sortOrder[field] === 'asc' ? 'desc' : 'asc'
    setSortOrder({ ...sortOrder, [field]: newOrder })
    
    const sorted = [...candidates].sort((a, b) => {
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
        case 'score':
          aVal = a.overall_score ?? -1
          bVal = b.overall_score ?? -1
          break
        case 'job':
          aVal = a.job_name.toLowerCase()
          bVal = b.job_name.toLowerCase()
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
    
    setCandidates(sorted)
  }

  const getCustomFieldValue = (candidate: CandidateWithJob, fieldName: string) => {
    const customValue = candidate.custom_field_values?.find(
      cfv => cfv.field_definition?.field_name === fieldName
    )
    return customValue?.field_value || '-'
  }

  // Extract unique rounds from all candidates based on order
  const rounds = useMemo(() => {
    const roundMap = new Map<number, { round_name: string; order: number }>()
    
    candidates.forEach(candidate => {
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
  }, [candidates])

  // Get round score for a specific candidate and order
  const getRoundScore = (candidate: CandidateWithJob, order: number) => {
    if (!candidate.overall_evaluation?.round_scores) return null
    
    const roundScore = Object.values(candidate.overall_evaluation.round_scores).find(
      score => score && typeof score === 'object' && 'order' in score && Math.floor(score.order) === order
    )
    
    return roundScore && 'score' in roundScore ? roundScore.score : null
  }

  // Extract unique custom fields from candidates
  const customFields = useMemo(() => {
    const fieldMap = new Map<string, { field_name: string; field_label: string; field_type: string }>()
    
    candidates.forEach(candidate => {
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
  }, [candidates])

  const handleStatusChange = (candidateId: string, status: CandidateUIStatus) => {
    // Status changes are not used since we removed the status column
    // This function is kept for interface compatibility
    onStatusChange(candidateId, status)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-80 bg-gray-200 rounded-full h-3 mx-auto mb-4">
            <div
              className="bg-orange-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${loadingProgress.total > 0 ? (loadingProgress.completed / loadingProgress.total) * 100 : 0}%`
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            <span className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
              Loading candidates...
            </span>
          </div>
          <p className="text-sm text-gray-500" style={{ fontFamily }}>
            {loadingProgress.completed} of {loadingProgress.total} jobs loaded
          </p>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          No candidates found
        </h3>
        <p className="text-gray-500" style={{ fontFamily }}>
          No candidates have been added to the selected jobs yet.
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
      {/* Scrollable Table Container */}
      <div 
        className="w-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{
          maxHeight: "calc(100vh - 240px)", // Adjust based on header height and padding
          height: "fit-content",
          scrollbarWidth: "thin",
          scrollbarColor: "#D1D5DB #F3F4F6"
        }}
      >
        <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: "1200px" }}>
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
                top: 0,
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
                minWidth: "200px",
                position: "sticky",
                top: 0,
                zIndex: 10
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
                minWidth: "200px",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div className="flex items-center gap-2">
                Job
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleSort('job')}
                >
                  {sortOrder.job === 'asc' ? 
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
                  minWidth: "120px",
                  position: "sticky",
                  top: 0,
                  zIndex: 10
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
                  minWidth: "120px",
                  position: "sticky",
                  top: 0,
                  zIndex: 10
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
                minWidth: "140px",
                position: "sticky",
                top: 0,
                zIndex: 10
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
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
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
          {candidates.map((candidate) => {
            return (
              <tr
                key={`${candidate.job_id}-${candidate.id}`}
                className="hover:bg-gray-50 transition-colors group"
              >
                {/* Candidate Info - Sticky */}
                <td
                  style={{
                    minWidth: "220px",
                    position: "sticky",
                    left: 0,
                    zIndex: 10,
                    padding: "12px",
                    backgroundColor: "white"
                  }}
                  className="group-hover:bg-gray-50 transition-colors"
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

                {/* Job Name */}
                <td style={{ minWidth: "200px", padding: "12px" }}>
                  <div 
                    className="text-sm font-medium text-gray-900"
                    style={{ fontFamily }}
                  >
                    {truncateText(candidate.job_name, 25)}
                  </div>
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
    </div>
  )
}
