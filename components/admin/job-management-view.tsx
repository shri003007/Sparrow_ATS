'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Settings, Trash2, Eye, Briefcase, Users } from 'lucide-react'
import { JobOpeningsApi, type JobOpeningListItem } from '@/lib/api/job-openings'
import { UserJobAccessApi, type UserJobAccess } from '@/lib/api/user-job-access'
import { UsersApi, type User } from '@/lib/api/users'
import { toast } from '@/hooks/use-toast'
import { JobUserAssignmentsModal } from './job-user-assignments-modal'

export function JobManagementView() {
  const [jobs, setJobs] = useState<JobOpeningListItem[]>([])
  const [selectedJob, setSelectedJob] = useState<JobOpeningListItem | null>(null)
  const [jobUsers, setJobUsers] = useState<UserJobAccess[]>([])
  const [allUserJobAccess, setAllUserJobAccess] = useState<UserJobAccess[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserAssignmentsModal, setShowUserAssignmentsModal] = useState(false)

  // Load all data on component mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load all data in parallel
      const [jobsResponse, userJobAccessResponse, usersResponse] = await Promise.all([
        JobOpeningsApi.getAllJobOpenings(),
        UserJobAccessApi.getUserJobAccess(),
        UsersApi.getUsers()
      ])

      setJobs(jobsResponse.job_openings)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllUsers(usersResponse.users)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJobSelect = (job: JobOpeningListItem) => {
    setSelectedJob(job)
    // Filter job users from the pre-loaded data
    const jobUserAssignments = allUserJobAccess.filter(access => access.job_opening_id === job.id)
    setJobUsers(jobUserAssignments)
  }

  const handleManageUserAssignments = () => {
    setShowUserAssignmentsModal(true)
  }

  const handleUserAssignmentsUpdate = async () => {
    // Reload all data to get updated user assignments
    try {
      const [jobsResponse, userJobAccessResponse, usersResponse] = await Promise.all([
        JobOpeningsApi.getAllJobOpenings(),
        UserJobAccessApi.getUserJobAccess(),
        UsersApi.getUsers()
      ])

      // Update all state with fresh data
      setJobs(jobsResponse.job_openings)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllUsers(usersResponse.users)

      // Update the selected job's user assignments from the fresh data
      if (selectedJob) {
        const jobUserAssignments = userJobAccessResponse.user_job_access.filter(
          access => access.job_opening_id === selectedJob.id
        )
        setJobUsers(jobUserAssignments)
      }
    } catch (error) {
      console.error('Error reloading data:', error)
      toast({
        title: "Error",
        description: "Failed to reload data",
        variant: "destructive"
      })
    }
    
    setShowUserAssignmentsModal(false)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'draft': return 'secondary'
      case 'closed': return 'outline'
      case 'paused': return 'destructive'
      default: return 'outline'
    }
  }

  const getAccessBadgeVariant = (accessType: string) => {
    switch (accessType) {
      case 'admin': return 'destructive'
      case 'write': return 'default'
      case 'read': return 'secondary'
      default: return 'outline'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredJobs = jobs.filter(job =>
    job.posting_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.job_status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.employment_type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Jobs ({filteredJobs.length})
              </CardTitle>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedJob?.id === job.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleJobSelect(job)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">{job.posting_title}</div>                      
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getStatusBadgeVariant(job.job_status)} className="text-xs">
                        {job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredJobs.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No jobs found matching your search
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Details & User Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedJob ? `${selectedJob.posting_title} - User Access` : 'Select a Job'}
              </CardTitle>
              {selectedJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageUserAssignments}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedJob ? (
              <div>
                {/* User Assignments */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    User Access ({jobUsers.length})
                  </h4>
                  {jobUsers.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {jobUsers.map((userAccess) => (
                        <div
                          key={userAccess.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {userAccess.user_name?.split(' ').map(n => n.charAt(0)).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{userAccess.user_name}</div>
                              <div className="text-xs text-gray-500">{userAccess.user_email}</div>
                            </div>
                          </div>
                          <Badge variant={getAccessBadgeVariant(userAccess.access_type)} className="text-xs">
                            {userAccess.access_type.charAt(0).toUpperCase() + userAccess.access_type.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <div>No user assignments</div>
                      <div className="text-sm">Click "Manage Users" to assign users to this job</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Select a Job</div>
                <div>Choose a job from the list to view and manage user assignments</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {selectedJob && (
        <JobUserAssignmentsModal
          isOpen={showUserAssignmentsModal}
          onClose={() => setShowUserAssignmentsModal(false)}
          job={selectedJob}
          jobUsers={jobUsers}
          allUsers={allUsers}
          onUpdate={handleUserAssignmentsUpdate}
        />
      )}
    </div>
  )
}
