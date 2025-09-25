"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Star, TrendingUp, User, FileText, Activity, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { CandidateActivityTimeline } from "./candidate-activity-timeline"
import { CandidateResumeView } from "./candidate-resume-view"
import { CandidateDashboardApi, type CandidateDashboardResponse, type ActivityItem } from "@/lib/api/candidate-dashboard"
import { CandidateResumeApi, ResumeNotFoundError, type ResumeInfo } from "@/lib/api/candidate-resume"
import type { CandidateDisplay } from "@/lib/candidate-types"
import type { JobOpeningListItem } from "@/lib/job-types"

interface CandidateDetailsViewProps {
  candidate: CandidateDisplay
  onBack: () => void
  onJobSelect?: (jobId: string) => void
  currentJobId?: string
}

export function CandidateDetailsView({ candidate, onBack, onJobSelect, currentJobId }: CandidateDetailsViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  // Helper function to get job initials (first 2 letters only, no special characters)
  const getJobInitials = (jobTitle: string): string => {
    return jobTitle
      .split(' ')
      .map(word => {
        // Find the first letter character in the word
        const firstLetter = word.split('').find(char => /[a-zA-Z]/.test(char))
        return firstLetter ? firstLetter.toUpperCase() : ''
      })
      .filter(initial => initial !== '') // Remove empty strings
      .slice(0, 2)
      .join('')
  }
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState<CandidateDashboardResponse | null>(null)
  const [activityData, setActivityData] = useState<ActivityItem[]>([])
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [showAllJobs, setShowAllJobs] = useState(false)

  // State for resume data
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null)
  const [isLoadingResume, setIsLoadingResume] = useState(true)
  const [resumeError, setResumeError] = useState<string | null>(null)

  // Fetch dashboard and resume data when component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!candidate.email) {
        setIsLoadingDashboard(false)
        return
      }

      try {
        setIsLoadingDashboard(true)
        setDashboardError(null)
        
        const data = await CandidateDashboardApi.getCandidateByEmail(candidate.email)
        setDashboardData(data)
        
        // Transform to activity timeline
        const activities = CandidateDashboardApi.transformToActivityTimeline(data)
        setActivityData(activities)
      } catch (error) {
        console.error('Failed to fetch candidate dashboard data:', error)
        setDashboardError(error instanceof Error ? error.message : 'Failed to load candidate data')
      } finally {
        setIsLoadingDashboard(false)
      }
    }

    const fetchResumeData = async () => {
      if (!candidate.email) {
        setIsLoadingResume(false)
        return
      }

      try {
        setIsLoadingResume(true)
        setResumeError(null)
        
        const resumeResponse = await CandidateResumeApi.getResume(candidate.email)
        setResumeInfo(resumeResponse.resume)
      } catch (error) {
        if (error instanceof ResumeNotFoundError) {
          // No resume found - this is not an error, just show upload option
          setResumeInfo(null)
          setResumeError(null)
        } else {
          console.error('Failed to fetch resume data:', error)
          setResumeError(error instanceof Error ? error.message : 'Failed to load resume')
          setResumeInfo(null)
        }
      } finally {
        setIsLoadingResume(false)
      }
    }

    fetchDashboardData()
    fetchResumeData()
  }, [candidate.email])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'selected':
        return { bg: '#DCFCE7', text: '#16A34A' }
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626' }
      case 'action_pending':
        return { bg: '#FEF3C7', text: '#D97706' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'selected':
        return 'Hired'
      case 'rejected':
        return 'Not Hired'
      case 'action_pending':
        return 'On Hold'
      default:
        return status
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: '#DCFCE7', text: '#16A34A' }
    if (score >= 60) return { bg: '#FEF3C7', text: '#D97706' }
    if (score >= 40) return { bg: '#FED7AA', text: '#EA580C' }
    return { bg: '#FEE2E2', text: '#DC2626' }
  }

  // Extract round scores from dashboard data grouped by job
  const jobRoundScores = dashboardData?.candidates 
    ? dashboardData.candidates
        .filter(jobCandidate => jobCandidate.overall_evaluation?.round_scores)
        .map(jobCandidate => ({
          jobTitle: jobCandidate.job_info.posting_title,
          jobId: jobCandidate.job_info.id,
          roundScores: Object.values(jobCandidate.overall_evaluation.round_scores)
            .filter((score: any) => score && typeof score === 'object' && 'order' in score)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
          overallScore: jobCandidate.overall_evaluation.overall_score
        }))
        .filter(job => job.roundScores.length > 0) // Only include jobs with scores
    : []

  // Check if we have any scores to display
  const hasAnyScores = jobRoundScores.length > 0

  const statusColor = getStatusBadgeColor(candidate.status)

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Contact Details */}
        <div className="w-80 bg-white border-r border-dashed border-gray-300 p-5 overflow-auto">
          {/* Back Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-white border border-gray-400 flex items-center justify-center hover:bg-gray-50"
              style={{ fontFamily }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarFallback 
                className="text-xl font-medium"
                style={{ 
                  fontFamily,
                  backgroundColor: "#E0E0E0",
                  color: "#666666"
                }}
              >
                {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-semibold text-center" style={{ color: "#4A90E2", fontFamily }}>
              {candidate.name}
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block" style={{ fontFamily }}>
                Email
              </label>
              <div className="border border-gray-300 rounded px-3 py-2 bg-white">
                <span className="text-sm" style={{ color: "#4A90E2", fontFamily }}>
                  {candidate.email}
                </span>
              </div>
            </div>

            {candidate.mobile_phone && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block" style={{ fontFamily }}>
                  Phone Number
                </label>
                <div className="border border-gray-300 rounded px-3 py-2 bg-white">
                  <span className="text-sm" style={{ color: "#4A90E2", fontFamily }}>
                    {candidate.mobile_phone}
                  </span>
                </div>
              </div>
            )}

            {candidate.current_location && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block" style={{ fontFamily }}>
                  Location
                </label>
                <div className="border border-gray-300 rounded px-3 py-2 bg-white">
                  <span className="text-sm" style={{ color: "#4A90E2", fontFamily }}>
                    {candidate.current_location}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Main Content */}
        <div className="flex-1 border-r border-dashed border-gray-300 p-5 overflow-auto">
          <Tabs defaultValue="current-round" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="current-round" className="flex items-center gap-2">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                Activities
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current-round" className="space-y-6">
              <h2 className="text-lg font-medium" style={{ color: "#333333", fontFamily }}>
                Candidate Details
              </h2>

              {/* Round Scores Card - Show loader while loading, then show scores if available */}
              {isLoadingDashboard ? (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-base font-medium mb-4" style={{ color: "#333333", fontFamily }}>
                    Round Scores
                  </h3>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-1/3" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </div>
              ) : hasAnyScores && (
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
                  <h3 className="text-base font-medium mb-4" style={{ color: "#333333", fontFamily }}>
                    Round Scores
                  </h3>
                  
                  <div className="space-y-6">
                    {jobRoundScores.map((jobScore, jobIndex) => (
                      <div key={jobScore.jobId} className="space-y-3">
                        {/* Job Title */}
                        <h4 className="text-sm font-medium text-gray-800 border-b border-gray-200 pb-2" style={{ fontFamily }}>
                          {jobScore.jobTitle}
                        </h4>
                        
                        {/* Round Scores for this job */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {jobScore.roundScores.map((roundScore: any, roundIndex) => {
                            const score = roundScore.score || 0
                            return (
                              <div key={roundIndex} className="bg-white border border-gray-300 rounded p-3 text-center">
                                <div className="text-xs text-gray-600 mb-1" style={{ fontFamily }}>
                                  {roundScore.round_name}
                                </div>
                                <div className="text-lg font-medium" style={{ color: "#333333", fontFamily }}>
                                  {Math.round(score)}/100
                                </div>
                              </div>
                            )
                          })}
                          
                          {/* Overall Score for this job */}
                          {jobScore.overallScore !== undefined && jobScore.overallScore !== null && (
                            <div className="bg-white border border-gray-300 rounded p-3 text-center">
                              <div className="text-xs text-gray-600 mb-1" style={{ fontFamily }}>
                                Overall Score
                              </div>
                              <div className="text-lg font-medium" style={{ color: "#4A90E2", fontFamily }}>
                                {Math.round(jobScore.overallScore)}/100
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

        

              {/* Resume Section */}
              <div className="mt-6">
                <CandidateResumeView 
                  candidateEmail={candidate.email}
                  candidateName={candidate.name}
                  resumeInfo={resumeInfo}
                  isLoading={isLoadingResume}
                  error={resumeError}
                  onResumeUpdate={() => {
                    // Refetch resume data
                    const fetchResumeData = async () => {
                      try {
                        setIsLoadingResume(true)
                        setResumeError(null)
                        const resumeResponse = await CandidateResumeApi.getResume(candidate.email)
                        setResumeInfo(resumeResponse.resume)
                      } catch (error) {
                        if (error instanceof ResumeNotFoundError) {
                          // No resume found - this is not an error, just show upload option
                          setResumeInfo(null)
                          setResumeError(null)
                        } else {
                          console.error('Failed to fetch resume data:', error)
                          setResumeError(error instanceof Error ? error.message : 'Failed to load resume')
                          setResumeInfo(null)
                        }
                      } finally {
                        setIsLoadingResume(false)
                      }
                    }
                    fetchResumeData()
                  }}
                />
              </div>

              {/* Notes */}
              {candidate.notes && (
                <div className="mt-6">
                  <h3 className="text-base font-medium mb-2" style={{ color: "#333333", fontFamily }}>
                    Notes
                  </h3>
                  <div className="bg-gray-50 border border-gray-300 rounded p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontFamily }}>
                      {candidate.notes}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {isLoadingDashboard ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : dashboardError ? (
                <div className="p-6 text-center">
                  <div className="text-red-600 mb-2">
                    <Activity className="w-12 h-12 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                    Failed to Load Activity
                  </h3>
                  <p className="text-gray-500" style={{ fontFamily }}>
                    {dashboardError}
                  </p>
                </div>
              ) : (
                <CandidateActivityTimeline activities={activityData} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Jobs Applied */}
        <div className="w-80 bg-white border-r border-dashed border-gray-300 p-5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium" style={{ color: "#333333", fontFamily }}>
              Jobs Applied
            </h2>
          </div>

          {/* Jobs List */}
          <div className={`space-y-4 ${showAllJobs ? 'overflow-y-auto flex-1' : ''}`}>
            {isLoadingDashboard ? (
              // Loading state
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : dashboardData && dashboardData.candidates ? (
              // Show jobs from dashboard data
              (() => {
                const allJobs = dashboardData.candidates
                const jobsToShow = showAllJobs ? allJobs : allJobs.slice(0, 4)
                
                return jobsToShow.map((job, index) => (
                  <div 
                    key={`${job.id}-${job.job_info.id}`} 
                    className={`bg-white border rounded p-4 transition-colors ${
                      job.job_info.id === currentJobId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300'
                    } ${
                      onJobSelect ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-400' : ''
                    }`}
                    onClick={() => {
                      if (job.job_info.id === currentJobId) {
                        // If clicking on current job, act like back button
                        onBack()
                      } else {
                        // If clicking on different job, navigate to that job
                        onJobSelect && onJobSelect(job.job_info.id)
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex-shrink-0 mt-1 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-700" style={{ fontFamily }}>
                          {getJobInitials(job.job_info.posting_title)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium mb-1" style={{ color: "#333333", fontFamily }}>
                          {job.job_info.posting_title}
                          {job.job_info.id === currentJobId && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1" style={{ fontFamily }}>
                          Applied: {formatDate(job.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              })()
            ) : (
              // Fallback: Show current candidate as a job (when dashboard data is not available)
              <div className="bg-white border border-gray-300 rounded p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex-shrink-0 mt-1 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600" style={{ fontFamily }}>
                      CA
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium mb-1" style={{ color: "#333333", fontFamily }}>
                      Current Application
                    </h3>
                    <p className="text-xs text-gray-600 mt-1" style={{ fontFamily }}>
                      Applied: {formatDate(candidate.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View All Link */}
          {dashboardData && dashboardData.candidates && dashboardData.candidates.length > 4 && !showAllJobs && (
            <div className="mt-4">
              <button 
                className="text-sm" 
                style={{ color: "#4A90E2", fontFamily }}
                onClick={() => setShowAllJobs(true)}
              >
                View All Jobs ({dashboardData.total_count})
              </button>
            </div>
          )}
          
          {/* Show Less Link */}
          {showAllJobs && (
            <div className="mt-4">
              <button 
                className="text-sm" 
                style={{ color: "#4A90E2", fontFamily }}
                onClick={() => setShowAllJobs(false)}
              >
                Show Less
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
