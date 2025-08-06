"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ChevronDown, Download, MapPin, Calendar, DollarSign } from "lucide-react"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"

interface CandidatesTableProps {
  candidates: CandidateDisplay[]
  onStatusChange: (candidateId: string, newStatus: CandidateUIStatus) => void
}

const STATUS_CONFIG = {
  selected: {
    label: 'Selected',
    color: '#10B981', // Green
    bgColor: '#D1FAE5',
  },
  action_pending: {
    label: 'Action pending',
    color: '#F59E0B', // Amber
    bgColor: '#FEF3C7',
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444', // Red
    bgColor: '#FEE2E2',
  }
} as const

type FilterTab = 'all' | 'action_pending' | 'selected' | 'rejected'

interface StatusFilterProps {
  selectedFilter: FilterTab
  onFilterChange: (filter: FilterTab) => void
  candidateCounts: Record<FilterTab, number>
}

function StatusFilter({ selectedFilter, onFilterChange, candidateCounts }: StatusFilterProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const filters: Array<{ key: FilterTab; label: string }> = [
    { key: 'all', label: 'All applicants' },
    { key: 'action_pending', label: 'Action pending' },
    { key: 'selected', label: 'Selected' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="border-b border-gray-200 mb-4">
      <div className="flex space-x-8">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              selectedFilter === filter.key ? 'border-b-2 border-gray-900' : ''
            }`}
            style={{
              color: selectedFilter === filter.key ? '#111827' : '#6B7280',
              fontFamily
            }}
          >
            {filter.label}
            {candidateCounts[filter.key] > 0 && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                }}
              >
                {candidateCounts[filter.key]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

interface StatusDropdownProps {
  currentStatus: CandidateUIStatus
  candidateId: string
  onStatusChange: (candidateId: string, newStatus: CandidateUIStatus) => void
}

function StatusDropdown({ currentStatus, candidateId, onStatusChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below')
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const currentConfig = STATUS_CONFIG[currentStatus]

  const calculatePosition = () => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 132 // 3 options × 44px height each
    const spaceBelow = viewportHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top
    
    // Determine if dropdown should appear above or below
    const shouldPositionAbove = spaceBelow < dropdownHeight + 10 && spaceAbove > dropdownHeight + 10
    
    setDropdownPosition(shouldPositionAbove ? 'above' : 'below')
    
    // Calculate portal position for fixed positioning
    setPortalStyle({
      position: 'fixed',
      left: buttonRect.left,
      width: Math.max(buttonRect.width, 150),
      top: shouldPositionAbove 
        ? buttonRect.top - dropdownHeight - 4
        : buttonRect.bottom + 4,
      zIndex: 1000
    })
  }

  const handleToggle = () => {
    if (!isOpen) {
      calculatePosition()
    }
    setIsOpen(!isOpen)
  }

  const handleStatusChange = (newStatus: CandidateUIStatus) => {
    onStatusChange(candidateId, newStatus)
    setIsOpen(false)
  }

  // Update position on scroll or resize
  useEffect(() => {
    if (isOpen) {
      const handlePositionUpdate = () => calculatePosition()
      
      window.addEventListener('scroll', handlePositionUpdate, true)
      window.addEventListener('resize', handlePositionUpdate)
      
      return () => {
        window.removeEventListener('scroll', handlePositionUpdate, true)
        window.removeEventListener('resize', handlePositionUpdate)
      }
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors border"
        style={{
          backgroundColor: currentConfig.bgColor,
          color: currentConfig.color,
          borderColor: currentConfig.color,
          fontFamily
        }}
      >
        <span>{currentConfig.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[999]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - Portal to body to avoid scroll container issues */}
          <div 
            ref={dropdownRef}
            className="bg-white border border-gray-200 rounded-lg shadow-lg"
            style={portalStyle}
          >
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(key as CandidateUIStatus)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                style={{ 
                  color: config.color,
                  fontFamily
                }}
              >
                {config.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CandidatesTable({ candidates, onStatusChange }: CandidatesTableProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all')
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Calculate candidate counts by filter tabs
  const candidateCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: candidates.length,
      action_pending: 0,
      selected: 0,
      rejected: 0
    }

    candidates.forEach(candidate => {
      if (candidate.status === 'action_pending') {
        counts.action_pending++
      } else if (candidate.status === 'rejected') {
        counts.rejected++
      } else if (candidate.status === 'selected') {
        counts.selected++
      }
    })

    return counts
  }, [candidates])

  // Filter candidates based on selected filter
  const filteredCandidates = useMemo(() => {
    if (selectedFilter === 'all') return candidates
    return candidates.filter(candidate => candidate.status === selectedFilter)
  }, [candidates, selectedFilter])

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          No candidates yet
        </h3>
        <p className="text-gray-500" style={{ fontFamily }}>
          Candidates will appear here once they apply or are added to this job.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Status Filter */}
      <StatusFilter
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        candidateCounts={candidateCounts}
      />

      {/* Table Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500" style={{ fontFamily }}>
          <div className="col-span-2">Applicant's name</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2">Location</div>
          <div className="col-span-1">Experience</div>
          <div className="col-span-1">Resume</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredCandidates.map((candidate) => (
          <div key={candidate.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Name */}
              <div className="col-span-2">
                <div 
                  className="font-medium text-gray-900 truncate"
                  style={{ fontFamily }}
                  title={candidate.name}
                >
                  <div className="relative">
                    <span className="block truncate">{candidate.name}</span>
                    <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white group-hover:from-gray-50 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <StatusDropdown
                  currentStatus={candidate.status}
                  candidateId={candidate.id}
                  onStatusChange={onStatusChange}
                />
              </div>

              {/* Email */}
              <div className="col-span-2">
                <div 
                  className="text-sm text-gray-900 truncate"
                  style={{ fontFamily }}
                  title={candidate.email}
                >
                  <div className="relative">
                    <span className="block truncate">{candidate.email}</span>
                    <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white group-hover:from-gray-50 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="col-span-2">
                <div 
                  className="text-sm text-gray-500 truncate"
                  style={{ fontFamily }}
                  title={candidate.mobile_phone}
                >
                  <div className="relative">
                    <span className="block truncate">{candidate.mobile_phone}</span>
                    <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white group-hover:from-gray-50 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="col-span-2">
                <div 
                  className="text-sm text-gray-500 truncate"
                  style={{ fontFamily }}
                  title={candidate.current_location || 'Not specified'}
                >
                  {candidate.current_location ? (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <div className="relative flex-1 min-w-0">
                        <span className="block truncate">{candidate.current_location}</span>
                        <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white group-hover:from-gray-50 to-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not specified</span>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div className="col-span-1">
                <div className="text-sm text-gray-900" style={{ fontFamily }}>
                  {candidate.experience_display}
                </div>
              </div>

              {/* Resume Download */}
              <div className="col-span-1">
                {candidate.resume_url ? (
                  <button
                    onClick={() => window.open(candidate.resume_url, '_blank')}
                    className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download Resume"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8">
                    <span className="text-gray-400 text-xs">N/A</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with count */}
      {filteredCandidates.length > 10 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <button
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            style={{ fontFamily }}
          >
            See {candidates.length - 10} more candidates
          </button>
        </div>
      )}
    </div>
  )
}