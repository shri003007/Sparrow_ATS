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
import { Search, Plus, Settings, Trash2, Eye, RefreshCw } from 'lucide-react'
import { UsersApi, type User } from '@/lib/api/users'
import { UserJobAccessApi, type UserJobAccess } from '@/lib/api/user-job-access'
import { JobOpeningsApi } from '@/lib/api/job-openings'
import { type JobOpeningListItem } from '@/lib/job-types'
import { toast } from '@/hooks/use-toast'
import { AddUserModal } from './add-user-modal'
import { UserJobAssignmentsModal } from './user-job-assignments-modal'

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userJobs, setUserJobs] = useState<UserJobAccess[]>([])
  const [allUserJobAccess, setAllUserJobAccess] = useState<UserJobAccess[]>([])
  const [allJobs, setAllJobs] = useState<JobOpeningListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [updatingAssignments, setUpdatingAssignments] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showJobAssignmentsModal, setShowJobAssignmentsModal] = useState(false)

  // Load all data on component mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load all data in parallel
      const [usersResponse, userJobAccessResponse, jobsResponse] = await Promise.all([
        UsersApi.getUsers(),
        UserJobAccessApi.getUserJobAccess(),
        JobOpeningsApi.getAllJobOpenings()
      ])

      setUsers(usersResponse.users)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllJobs(jobsResponse.job_openings)
      
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
      const [usersResponse, userJobAccessResponse, jobsResponse] = await Promise.all([
        UsersApi.getUsers(),
        UserJobAccessApi.getUserJobAccess(),
        JobOpeningsApi.getAllJobOpenings()
      ])

      setUsers(usersResponse.users)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllJobs(jobsResponse.job_openings)

      // Update the selected user's job assignments from the fresh data
      if (selectedUser) {
        const userJobAssignments = userJobAccessResponse.user_job_access.filter(
          access => access.user_id === selectedUser.id
        )
        setUserJobs(userJobAssignments)
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

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    // Filter user jobs from the pre-loaded data
    const userJobAssignments = allUserJobAccess.filter(access => access.user_id === user.id)
    setUserJobs(userJobAssignments)
  }

  const handleAddUser = async (userData: { email: string; first_name: string; last_name?: string }) => {
    setAddingUser(true)
    try {
      await UsersApi.createUser({
        ...userData,
        role: 'recruiter', // Default role for new users
        is_active: true
      })
      
      // Reload all data to get the new user
      const [usersResponse, userJobAccessResponse, jobsResponse] = await Promise.all([
        UsersApi.getUsers(),
        UserJobAccessApi.getUserJobAccess(),
        JobOpeningsApi.getAllJobOpenings()
      ])

      // Update all state with fresh data
      setUsers(usersResponse.users)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllJobs(jobsResponse.job_openings)
      
      toast({
        title: "Success",
        description: "User added successfully"
      })
      setShowAddUserModal(false)
    } catch (error) {
      console.error('Error adding user:', error)
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive"
      })
    } finally {
      setAddingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will remove all their job access permissions.')) {
      return
    }

    setDeletingUser(userId)
    try {
      await UsersApi.deleteUser(userId)
      
      // Reload all data after deletion
      const [usersResponse, userJobAccessResponse, jobsResponse] = await Promise.all([
        UsersApi.getUsers(),
        UserJobAccessApi.getUserJobAccess(),
        JobOpeningsApi.getAllJobOpenings()
      ])

      // Update all state with fresh data
      setUsers(usersResponse.users)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllJobs(jobsResponse.job_openings)
      
      // Clear selected user if it was the deleted one
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
        setUserJobs([])
      }
      
      toast({
        title: "Success",
        description: "User deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    } finally {
      setDeletingUser(null)
    }
  }

  const handleManageJobAssignments = () => {
    setShowJobAssignmentsModal(true)
  }

  const handleJobAssignmentsUpdate = async () => {
    setUpdatingAssignments(true)
    // Reload all data to get updated job assignments
    try {
      const [usersResponse, userJobAccessResponse, jobsResponse] = await Promise.all([
        UsersApi.getUsers(),
        UserJobAccessApi.getUserJobAccess(),
        JobOpeningsApi.getAllJobOpenings()
      ])

      // Update all state with fresh data
      setUsers(usersResponse.users)
      setAllUserJobAccess(userJobAccessResponse.user_job_access)
      setAllJobs(jobsResponse.job_openings)

      // Update the selected user's job assignments from the fresh data
      if (selectedUser) {
        const userJobAssignments = userJobAccessResponse.user_job_access.filter(
          access => access.user_id === selectedUser.id
        )
        setUserJobs(userJobAssignments)
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
    
    setShowJobAssignmentsModal(false)
  }

  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error'
      case 'hr_manager': return 'primary'
      case 'hiring_manager': return 'secondary'
      case 'interviewer': return 'neutral'
      case 'recruiter': 
      default: return 'primary'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getAccessChipColor = (accessType: string) => {
    switch (accessType) {
      case 'admin': return 'error'
      case 'write': return 'primary'
      case 'read': return 'secondary'
      default: return 'neutral'
    }
  }

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
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
            Loading User Management...
          </Text>
          <Text size="sm" color="$neutral500">
            Fetching users and job assignments
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
        {/* Users List */}
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
                <Search size={20} />
                <h2 className="text-lg font-semibold text-gray-900">
                  Users ({filteredUsers.length})
                </h2>
              </div>
              <Box css={{ display: 'flex', gap: '$2' }}>
                <Button 
                  variant="outline" 
                  size="sm"
                  leftIcon={refreshing ? <CircleLoader size="sm" /> : <RefreshCw size={16} />}
                  onClick={refreshData}
                  disabled={refreshing || addingUser || deletingUser || updatingAssignments}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  variant="solid" 
                  color="primary" 
                  size="sm"
                  leftIcon={addingUser ? <CircleLoader size="sm" /> : <Plus size={16} />}
                  onClick={() => setShowAddUserModal(true)}
                  disabled={addingUser || refreshing}
                >
                  {addingUser ? 'Adding...' : 'Add User'}
                </Button>
              </Box>
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
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                css={{ paddingLeft: '$18' }}
              />
            </Box>
          </Box>
          <Box css={{ flex: 1, overflowY: 'auto', padding: '$2', minHeight: 0, position: 'relative' }}>
            {(addingUser || deletingUser || updatingAssignments || refreshing) && (
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
                    {addingUser && 'Adding user...'}
                    {deletingUser && 'Deleting user...'}
                    {updatingAssignments && 'Updating assignments...'}
                    {refreshing && 'Refreshing data...'}
                  </Text>
                </Box>
              </Box>
            )}
            <Box css={{ display: 'flex', flexDirection: 'column', gap: '$2' }}>
              {filteredUsers.map((user) => (
                <Box
                  key={user.id}
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
                    ...(selectedUser?.id === user.id ? {
                      backgroundColor: '$primary50',
                      border: '1px solid $primary200',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                    } : {})
                  }}
                  onClick={() => handleUserSelect(user)}
                >
                  <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box css={{ display: 'flex', alignItems: 'center', gap: '$3' }}>
                      <Avatar
                        size="md"
                        name={`${user.first_name} ${user.last_name || ''}`}
                      />
                      <div>
                        <div className="font-medium text-gray-900 mb-1">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </Box>
                    <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
                      <Chip 
                        color={getRoleChipColor(user.role)}
                        size="sm"
                      >
                        {formatRole(user.role)}
                      </Chip>
                      {!user.is_active && (
                        <Chip color="neutral" size="sm">
                          Inactive
                        </Chip>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">
                  No users found matching your search
                </p>
              </div>
            )}
          </Box>
        </Box>

        {/* User Details & Job Assignments */}
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
                {selectedUser ? `${selectedUser.first_name}'s Job Assignments` : 'Select a User'}
              </h2>
              {selectedUser && (
                <Box css={{ display: 'flex', gap: '$2' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={updatingAssignments ? <CircleLoader size="sm" /> : <Settings size={16} />}
                    onClick={handleManageJobAssignments}
                    disabled={updatingAssignments}
                  >
                    {updatingAssignments ? 'Updating...' : 'Manage Access'}
                  </Button>
                  {selectedUser.role !== 'admin' && (
                    <Button
                      variant="solid"
                      color="error"
                      size="sm"
                      leftIcon={deletingUser === selectedUser.id ? <CircleLoader size="sm" /> : <Trash2 size={16} />}
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      disabled={deletingUser === selectedUser.id}
                    >
                      {deletingUser === selectedUser.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
          <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box css={{ padding: '$4', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              {updatingAssignments && (
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
                      Updating job assignments...
                    </Text>
                  </Box>
                </Box>
              )}
              {selectedUser ? (
                <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {/* Job Assignments */}
                  <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <h3 className="text-md font-medium text-gray-900 mb-3">
                      Job Access ({userJobs.length})
                    </h3>
                  {selectedUser.role === 'admin' ? (
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="font-medium text-blue-800 mb-1">
                        Admin Access
                      </div>
                      <div className="text-sm text-blue-600">
                        This user has admin privileges and can access all jobs
                      </div>
                    </div>
                  ) : userJobs.length > 0 ? (
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                      {userJobs.map((jobAccess) => (
                        <div
                          key={jobAccess.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="font-medium text-gray-900">{jobAccess.job_title}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                      <Eye size={32} className="mx-auto mb-2 text-gray-400" />
                      <div className="text-gray-500 mb-1">
                        No job assignments
                      </div>
                      <div className="text-sm text-gray-500">
                        Click "Manage Access" to assign jobs
                      </div>
                    </div>
                    )}
                  </Box>
                </Box>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Search size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Select a User
                  </h3>
                  <p className="text-gray-500 text-center max-w-sm">
                    Choose a user from the list to view and manage their job assignments
                  </p>
                </div>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Modals */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onAdd={handleAddUser}
      />

      {selectedUser && (
        <UserJobAssignmentsModal
          isOpen={showJobAssignmentsModal}
          onClose={() => setShowJobAssignmentsModal(false)}
          user={selectedUser}
          userJobs={userJobs}
          allJobs={allJobs}
          onUpdate={handleJobAssignmentsUpdate}
        />
      )}
    </Box>
  )
}
