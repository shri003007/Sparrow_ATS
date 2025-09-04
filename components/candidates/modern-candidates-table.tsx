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
}

export function ModernCandidatesTable({ candidates, onStatusChange }: ModernCandidatesTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const [sortOrder, setSortOrder] = useState<{[key: string]: 'asc' | 'desc'}>({})
  const [localCandidates, setLocalCandidates] = useState<CandidateDisplay[]>(candidates)

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
          aVal = a.status
          bVal = b.status
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
                zIndex: 100
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
