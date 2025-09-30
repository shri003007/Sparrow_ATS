'use client'

import { useState, useEffect } from 'react'
import { 
  Button, 
  Input, 
  Chip, 
  Box, 
  Text, 
  Heading, 
  Avatar, 
  CircleLoader 
} from '@sparrowengg/twigs-react'
import { Search, Settings, Trash2, Eye, Briefcase, Users, RefreshCw } from 'lucide-react'
import { JobOpeningsApi } from '@/lib/api/job-openings'
import { type JobOpeningListItem } from '@/lib/job-types'
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
  const [refreshing, setRefreshing] = useState(false)
  const [updatingAssignments, setUpdatingAssignments] = useState(false)
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
      
      // Small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 300))
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

  const refreshData = async () => {
    setRefreshing(true)
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

      // Update the selected job's user assignments from the fresh data
      if (selectedJob) {
        const jobUserAssignments = userJobAccessResponse.user_job_access.filter(
          access => access.job_opening_id === selectedJob.id
        )
        setJobUsers(jobUserAssignments)
      }

      toast({
        title: "Success",
        description: "Data refreshed successfully"
      })
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
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
    setUpdatingAssignments(true)
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
    } finally {
      setUpdatingAssignments(false)
    }
    
    setShowUserAssignmentsModal(false)
  }

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'active': return 'primary'
      case 'draft': return 'secondary'
      case 'closed': return 'neutral'
      case 'paused': return 'error'
      default: return 'neutral'
    }
  }

  const getAccessChipColor = (accessType: string) => {
    switch (accessType) {
      case 'admin': return 'error'
      case 'write': return 'primary'
      case 'read': return 'secondary'
      default: return 'neutral'
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
      <Box css={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        minHeight: '400px',
        backgroundColor: '$neutral25'
      }}>
        <Box css={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '$3' }}>
          <CircleLoader size="xl" />
          <Text size="lg" weight="medium" color="$neutral700">
            Loading Job Management...
          </Text>
          <Text size="sm" color="$neutral500">
            Fetching jobs and user assignments
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box css={{ padding: '$4', height: '100%', overflow: 'hidden' }}>
      <Box css={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr',
        '@media (min-width: 1024px)': {
          gridTemplateColumns: 'repeat(2, 1fr)'
        },
        gap: '$4',
        height: 'calc(100% - 32px)' // Fixed height minus reduced padding
      }}>
        {/* Jobs List */}
        <Box css={{ 
          backgroundColor: 'white', 
          borderRadius: '$md', 
          boxShadow: '$sm',
          border: '1px solid $neutral200',
          display: 'flex',
          flexDirection: 'column',
          height: '100%', // Take full height of grid cell
          minHeight: 0
        }}>
          <Box css={{ padding: '$4', borderBottom: '1px solid $neutral200', flexShrink: 0 }}>
            <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$4' }}>
              <div className="flex items-center gap-2">
                <Briefcase size={20} />
                <h2 className="text-lg font-semibold text-gray-900">
                  Jobs ({filteredJobs.length})
                </h2>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                leftIcon={refreshing ? <CircleLoader size="sm" /> : <RefreshCw size={16} />}
                onClick={refreshData}
                disabled={refreshing || updatingAssignments}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
            <Box css={{ position: 'relative' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--colors-neutral400)'
                }} 
              />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                css={{ paddingLeft: '$18' }}
              />
            </Box>
          </Box>
          <Box css={{ flex: 1, overflowY: 'auto', padding: '$2', minHeight: 0, position: 'relative' }}>
            {(updatingAssignments || refreshing) && (
              <Box css={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 10,
                borderRadius: '$md'
              }}>
                <Box css={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '$2' }}>
                  <CircleLoader size="lg" />
                  <Text size="sm" color="$neutral600">
                    {updatingAssignments && 'Updating user assignments...'}
                    {refreshing && 'Refreshing data...'}
                  </Text>
                </Box>
              </Box>
            )}
            <Box css={{ display: 'flex', flexDirection: 'column', gap: '$2' }}>
              {filteredJobs.map((job) => (
                <Box
                  key={job.id}
                  css={{ 
                    padding: '$4', 
                    borderRadius: '$md',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                    '&:hover': { 
                      backgroundColor: '$neutral50',
                      border: '1px solid $neutral200'
                    },
                    ...(selectedJob?.id === job.id ? {
                      backgroundColor: '$primary50',
                      border: '1px solid $primary200',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                    } : {})
                  }}
                  onClick={() => handleJobSelect(job)}
                >
                  <Box css={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-2">
                        {job.posting_title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {job.employment_type.replace('_', ' ')}
                      </div>
                    </div>
                    <Box css={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '$1' }}>
                      <Chip 
                        color={getStatusChipColor(job.job_status)}
                        size="sm"
                      >
                        {job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)}
                      </Chip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            {filteredJobs.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  No jobs found matching your search
                </p>
              </div>
            )}
          </Box>
        </Box>

        {/* Job Details & User Assignments */}
        <Box css={{ 
          backgroundColor: 'white', 
          borderRadius: '$md', 
          boxShadow: '$sm',
          border: '1px solid $neutral200',
          display: 'flex',
          flexDirection: 'column',
          height: '100%', // Take full height of grid cell
          minHeight: 0
        }}>
          <Box css={{ padding: '$4', borderBottom: '1px solid $neutral200', flexShrink: 0 }}>
            <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedJob ? `${selectedJob.posting_title} - User Access` : 'Select a Job'}
              </h2>
              {selectedJob && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={updatingAssignments ? <CircleLoader size="sm" /> : <Settings size={16} />}
                  onClick={handleManageUserAssignments}
                  disabled={updatingAssignments}
                >
                  {updatingAssignments ? 'Updating...' : 'Manage Users'}
                </Button>
              )}
            </Box>
          </Box>
          <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box css={{ padding: '$4', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              {(updatingAssignments || refreshing) && (
                <Box css={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 10,
                  borderRadius: '$md'
                }}>
                  <Box css={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '$2' }}>
                    <CircleLoader size="lg" />
                    <Text size="sm" color="$neutral600">
                      {updatingAssignments && 'Updating user assignments...'}
                      {refreshing && 'Refreshing data...'}
                    </Text>
                  </Box>
                </Box>
              )}
              {selectedJob ? (
                <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {/* User Assignments */}
                  <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={16} />
                      <h3 className="text-md font-medium text-gray-900">
                        User Access ({jobUsers.length})
                      </h3>
                    </div>
                  {jobUsers.length > 0 ? (
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                      {jobUsers.map((userAccess) => (
                        <div
                          key={userAccess.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              size="sm"
                              name={userAccess.user_name || 'User'}
                            />
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {userAccess.user_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {userAccess.user_email}
                              </div>
                            </div>
                          </div>
                          <Chip 
                            color={getAccessChipColor(userAccess.access_type)}
                            size="sm"
                          >
                            {userAccess.access_type.charAt(0).toUpperCase() + userAccess.access_type.slice(1)}
                          </Chip>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                      <Users size={32} className="mx-auto mb-2 text-gray-400" />
                      <div className="text-gray-500 mb-1">
                        No user assignments
                      </div>
                      <div className="text-sm text-gray-500">
                        Click "Manage Users" to assign users to this job
                      </div>
                    </div>
                    )}
                  </Box>
                </Box>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Briefcase size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Select a Job
                  </h3>
                  <p className="text-gray-500 text-center max-w-sm">
                    Choose a job from the list to view and manage user assignments
                  </p>
                </div>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

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
    </Box>
  )
}
