"use client"

import { Clock, User, TrendingUp, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ActivityItem } from "@/lib/api/candidate-dashboard"

interface CandidateActivityTimelineProps {
  activities: ActivityItem[]
}

export function CandidateActivityTimeline({ activities }: CandidateActivityTimelineProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application':
        return <User className="w-4 h-4" />
      case 'stage_move':
        return <TrendingUp className="w-4 h-4" />
      case 'feedback':
        return <FileText className="w-4 h-4" />
      case 'evaluation':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string, status?: string) => {
    switch (type) {
      case 'application':
        return { bg: '#DBEAFE', text: '#1D4ED8', border: '#3B82F6' }
      case 'stage_move':
        if (status === 'selected') return { bg: '#DCFCE7', text: '#16A34A', border: '#22C55E' }
        if (status === 'rejected') return { bg: '#FEE2E2', text: '#DC2626', border: '#EF4444' }
        return { bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' }
      case 'evaluation':
        return { bg: '#F3E8FF', text: '#7C3AED', border: '#8B5CF6' }
      case 'feedback':
        return { bg: '#F0FDF4', text: '#15803D', border: '#22C55E' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle className="w-3 h-3 text-green-600" />
      case 'rejected':
        return <XCircle className="w-3 h-3 text-red-600" />
      case 'action_pending':
        return <AlertCircle className="w-3 h-3 text-yellow-600" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRoundType = (roundType?: string) => {
    if (!roundType) return ''
    return roundType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          No Activity Found
        </h3>
        <p className="text-gray-500" style={{ fontFamily }}>
          No activity records available for this candidate.
        </p>
      </div>
    )
  }

  // Group activities by job
  const activitiesByJob = activities.reduce((acc, activity) => {
    if (!acc[activity.job_id]) {
      acc[activity.job_id] = {
        job_title: activity.job_title,
        activities: []
      }
    }
    acc[activity.job_id].activities.push(activity)
    return acc
  }, {} as Record<string, { job_title: string; activities: ActivityItem[] }>)

  // Sort jobs by most recent activity
  const sortedJobs = Object.entries(activitiesByJob).sort(([, a], [, b]) => {
    const latestA = Math.max(...a.activities.map(act => new Date(act.timestamp).getTime()))
    const latestB = Math.max(...b.activities.map(act => new Date(act.timestamp).getTime()))
    return latestB - latestA
  })

  return (
    <div className="space-y-6">
      {sortedJobs.map(([jobId, jobData]) => (
        <Card key={jobId} className="overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
              {jobData.job_title}
            </h3>
            <p className="text-sm text-gray-600 mt-1" style={{ fontFamily }}>
              {jobData.activities.length} activities
            </p>
          </div>
          
          <CardContent className="p-0">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {jobData.activities.map((activity, index) => {
                const colors = getActivityColor(activity.type, activity.details?.status)
                const isLast = index === jobData.activities.length - 1
                
                return (
                  <div key={activity.id} className="relative flex items-start p-6">
                    {/* Timeline dot */}
                    <div 
                      className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white"
                      style={{ borderColor: colors.border }}
                    >
                      <div style={{ color: colors.text }}>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="ml-6 flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
                              {activity.description}
                            </h4>
                            {activity.details?.status && getStatusIcon(activity.details.status)}
                          </div>                                                
                          <p className="text-xs text-gray-500" style={{ fontFamily }}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
