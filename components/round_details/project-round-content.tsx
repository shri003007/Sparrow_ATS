"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Calendar, ChevronDown } from "lucide-react"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse, RoundCandidate } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Mail, Phone, MapPin } from "lucide-react"
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

interface ProjectRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy: string
}

function RoundStatusDropdown({ currentStatus, candidateId, onStatusChange }: {
  currentStatus: RoundStatus
  candidateId: string
  onStatusChange: (candidateId: string, newStatus: RoundStatus) => void
}) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const statusConfig = ROUND_STATUS_CONFIG[currentStatus]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-8 px-3 text-xs"
          style={{
            backgroundColor: statusConfig.bgColor,
            borderColor: statusConfig.color,
            color: statusConfig.color,
            fontFamily
          }}
        >
          {statusConfig.label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(ROUND_STATUS_CONFIG).map(([status, config]) => (
          <DropdownMenuItem
            key={status}
            onClick={() => onStatusChange(candidateId, status as RoundStatus)}
            className="flex items-center gap-2"
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ProjectRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: ProjectRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Fetch round data
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        const data = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
        setRoundData(data)
        setLocalCandidates(data.candidates || [])
      } catch (err) {
        console.error('Failed to fetch round data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load round data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoundData()
  }, [currentRound?.id])

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    // Update local state only (same pattern as INTERVIEW round)
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
    
    // Update selected candidate if it's currently open in the panel
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
      return candidate.candidate_rounds[0].status as RoundStatus
    }
    return candidate.round_status as RoundStatus
  }

  const openEvaluationPanel = (candidate: RoundCandidate) => {
    setSelectedCandidate(candidate)
    setIsPanelOpen(true)
  }

  const closeEvaluationPanel = () => {
    setSelectedCandidate(null)
    setIsPanelOpen(false)
  }

  const nextRound = rounds[currentStepIndex + 1]
  const completedCandidatesCount = localCandidates.filter(
    candidate => getCandidateRoundStatus(candidate) === 'selected'
  ).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-500" style={{ fontFamily }}>Loading project round data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4" style={{ fontFamily }}>{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!roundData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500" style={{ fontFamily }}>No round data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Round Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily }}>
            {roundData.template_info.round_name}
          </h2>
          <p className="text-gray-600 mt-1" style={{ fontFamily }}>
            Round {roundData.template_info.order_index} • {roundData.candidate_count} candidates
          </p>
        </div>
        
        {nextRound && (
          <Button onClick={onNextRound} className="flex items-center gap-2">
            Next: {nextRound.round_name}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Round Progress */}
      {completedCandidatesCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm" style={{ fontFamily }}>
            {completedCandidatesCount} of {localCandidates.length} candidates have completed this round
          </p>
        </div>
      )}

      {/* Candidates Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
            Project Candidates
          </h3>
        </div>
        
        <div className="overflow-hidden">
          {localCandidates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                  No candidates in this round
                </h3>
                <p className="text-gray-500" style={{ fontFamily }}>
                  Candidates will appear here once they're moved to this round.
                </p>
              </div>
            </div>
          ) : (
            <Table style={{ minWidth: 'max-content', width: 'fit-content' }}>
              <TableHeader>
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
                        <div className="flex items-center gap-1 text-sm text-gray-600" style={{ fontFamily }}>
                          <Mail className="w-3 h-3" />
                          {candidate.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600" style={{ fontFamily }}>
                          <Phone className="w-3 h-3" />
                          {candidate.mobile_phone}
                        </div>
                        {candidate.current_location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600" style={{ fontFamily }}>
                            <MapPin className="w-3 h-3" />
                            {candidate.current_location}
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

                    {/* Project Score */}
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
                              <div className="w-10 h-10 rounded-full flex items-center justify-center border-2" style={{
                                backgroundColor: `${getScoreColor(score)}20`,
                                borderColor: getScoreColor(score)
                              }}>
                                <span className="text-sm font-medium" style={{
                                  fontFamily,
                                  color: getScoreColor(score)
                                }}>
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
          )}
        </div>
      </div>

      {/* Project-specific Evaluation Panel */}
      <CandidateEvaluationPanel
        candidate={selectedCandidate}
        isOpen={isPanelOpen}
        onClose={closeEvaluationPanel}
        roundType="PROJECT"
        onStatusChange={handleStatusChange}
        isEvaluating={false}
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
