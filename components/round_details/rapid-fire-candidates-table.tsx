"use client"

import React, { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Mail, ChevronDown, FileText, Filter, X, Search } from "lucide-react"
import type { RoundCandidate, CustomFieldDefinition } from "@/lib/round-candidate-types"
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
    label: 'On Hold',
    color: '#F59E0B', 
    bgColor: '#FEF3C7'
  }
} as const

interface RapidFireCandidatesTableProps {
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
  currentStatusById?: Record<string, RoundStatus>
  onCandidateUpdated?: (updatedCandidate: RoundCandidate) => void
}

interface RoundStatusDropdownProps {
  currentStatus: RoundStatus
  candidateId: string
  onStatusChange: (candidateId: string, newStatus: RoundStatus) => void
}

interface FilterState {
  searchTerm: string
  statusFilter: RoundStatus | 'all'
  customFieldFilters: Record<string, string>
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

export function RapidFireCandidatesTable({ 
  candidates,
  customFieldDefinitions,
  isLoading,
  roundInfo,
  jobOpeningId,
  onStatusChange,
  currentStatusById,
  onCandidateUpdated = () => {},
  sparrowRoundId = '',
  currentRoundName = 'Rapid Fire Round',
  candidateReEvaluationStates = {},
  onReEvaluationStateChange = () => {}
}: {
  candidates: RoundCandidate[]
  customFieldDefinitions: CustomFieldDefinition[]
  isLoading: boolean
  roundInfo?: any
  jobOpeningId?: string
  onStatusChange: (candidateId: string, status: RoundStatus) => void
  currentStatusById: Record<string, RoundStatus>
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
}) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [selectedCandidate, setSelectedCandidate] = useState<RoundCandidate | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: 'all',
    customFieldFilters: {}
  })



  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusForCandidate = (candidate: RoundCandidate): RoundStatus => {
    if (currentStatusById) {
      return currentStatusById[candidate.id] || candidate.round_status as RoundStatus
    }
    return candidate.round_status as RoundStatus
  }

  const getCustomFieldValue = (candidate: RoundCandidate, fieldId: string) => {
    const customValue = candidate.custom_field_values.find(
      cv => cv.field_definition_id === fieldId
    )
    return customValue?.field_value || '-'
  }

  // Get unique values for custom field filters
  const uniqueCustomFieldValues = useMemo(() => {
    const valuesByField: Record<string, Set<string>> = {}
    
    customFieldDefinitions.forEach(field => {
      valuesByField[field.id] = new Set()
      candidates.forEach(candidate => {
        const value = getCustomFieldValue(candidate, field.id)
        if (value && value !== '-') {
          valuesByField[field.id].add(value)
        }
      })
    })
    
    return Object.fromEntries(
      Object.entries(valuesByField).map(([fieldId, values]) => [
        fieldId,
        Array.from(values).sort()
      ])
    )
  }, [candidates, customFieldDefinitions])

  // Filter candidates based on current filters
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesName = candidate.name.toLowerCase().includes(searchLower)
        const matchesEmail = candidate.email.toLowerCase().includes(searchLower)
        
        if (!matchesName && !matchesEmail) {
          return false
        }
      }

      // Status filter
      if (filters.statusFilter !== 'all') {
        const candidateStatus = getStatusForCandidate(candidate)
        if (candidateStatus !== filters.statusFilter) {
          return false
        }
      }

      // Custom field filters
      for (const [fieldId, filterValue] of Object.entries(filters.customFieldFilters)) {
        if (filterValue) {
          const candidateValue = getCustomFieldValue(candidate, fieldId)
          if (candidateValue !== filterValue) {
            return false
          }
        }
      }

      return true
    })
  }, [candidates, filters, getStatusForCandidate])

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      customFieldFilters: {}
    })
  }

  const hasActiveFilters = filters.searchTerm || filters.statusFilter !== 'all' || 
    Object.values(filters.customFieldFilters).some(Boolean)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Spinner className="w-6 h-6" />
          <span className="text-gray-600" style={{ fontFamily }}>Loading candidates...</span>
        </div>
      </div>
    )
  }

  if (!candidates.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 mb-2" style={{ fontFamily }}>
            No candidates found for this round
          </div>
          <div className="text-sm text-gray-500" style={{ fontFamily }}>
            Candidates will appear here once they are assigned to this round.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 border-b bg-gray-50">
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search candidates..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
              style={{ fontFamily }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
            style={{ fontFamily }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {Object.values(filters).filter(v => v && v !== 'all').length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="flex items-center gap-2 text-gray-500"
              style={{ fontFamily }}
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block" style={{ fontFamily }}>
                Status
              </label>
              <select
                value={filters.statusFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{ fontFamily }}
              >
                <option value="all">All Statuses</option>
                <option value="action_pending">On Hold</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Custom Field Filters */}
            {customFieldDefinitions.slice(0, 2).map(field => (
              <div key={field.id}>
                <label className="text-xs font-medium text-gray-500 mb-1 block" style={{ fontFamily }}>
                  {field.field_label}
                </label>
                <select
                  value={filters.customFieldFilters[field.id] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    customFieldFilters: {
                      ...prev.customFieldFilters,
                      [field.id]: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{ fontFamily }}
                >
                  <option value="">All {field.field_label}</option>
                  {uniqueCustomFieldValues[field.id]?.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600" style={{ fontFamily }}>
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead style={{ fontFamily }}>Candidate</TableHead>
              <TableHead style={{ fontFamily }}>Status</TableHead>
              <TableHead style={{ fontFamily }}>Score</TableHead>
              {/* Custom Fields */}
              {customFieldDefinitions.map((field) => (
                <TableHead key={field.id} style={{ fontFamily }}>
                  {field.field_label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        <TableBody>
          {filteredCandidates.map((candidate) => {
            const candidateStatus = getStatusForCandidate(candidate)
            
            return (
              <TableRow 
                key={candidate.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback 
                        className="text-white text-sm font-medium"
                        style={{ backgroundColor: "#FF6B35" }}
                      >
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900" style={{ fontFamily }}>
                        {candidate.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span style={{ fontFamily }}>{candidate.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {onStatusChange ? (
                    <RoundStatusDropdown
                      currentStatus={candidateStatus}
                      candidateId={candidate.id}
                      onStatusChange={onStatusChange}
                    />
                  ) : (
                    <Badge 
                      style={{
                        backgroundColor: ROUND_STATUS_CONFIG[candidateStatus].bgColor,
                        color: ROUND_STATUS_CONFIG[candidateStatus].color,
                        fontFamily
                      }}
                    >
                      {ROUND_STATUS_CONFIG[candidateStatus].label}
                    </Badge>
                  )}
                </TableCell>

                {/* Score Column - Hidden for sales rounds */}
                <TableCell>
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-gray-400" style={{ fontFamily }}>
                      -
                    </span>
                  </div>
                </TableCell>

                {/* Custom Fields */}
                {customFieldDefinitions.map((field) => (
                  <TableCell 
                    key={field.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <span className="text-sm text-gray-900" style={{ fontFamily }}>
                      {getCustomFieldValue(candidate, field.id)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
        </Table>
      </div>

      {/* Candidate Evaluation Panel */}
      {selectedCandidate && (
        <CandidateEvaluationPanel
          candidate={selectedCandidate}
          isOpen={true}
          onClose={() => setSelectedCandidate(null)}
          roundType={roundInfo?.round_type || 'RAPID_FIRE'}
          onCandidateUpdated={onCandidateUpdated}
          sparrowRoundId={sparrowRoundId}
          currentRoundName={currentRoundName}
          candidateReEvaluationStates={candidateReEvaluationStates}
          onReEvaluationStateChange={onReEvaluationStateChange}
        />
      )}
    </>
  )
}
