'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Plus, Settings, Trash2, Eye } from 'lucide-react'
import { UsersApi, type User } from '@/lib/api/users'
import { UserJobAccessApi, type UserJobAccess } from '@/lib/api/user-job-access'
import { JobOpeningsApi, type JobOpeningListItem } from '@/lib/api/job-openings'
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

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    // Filter user jobs from the pre-loaded data
    const userJobAssignments = allUserJobAccess.filter(access => access.user_id === user.id)
    setUserJobs(userJobAssignments)
  }

  const handleAddUser = async (userData: { email: string; first_name: string; last_name?: string }) => {
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
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will remove all their job access permissions.')) {
      return
    }

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
    }
  }

  const handleManageJobAssignments = () => {
    setShowJobAssignmentsModal(true)
  }

  const handleJobAssignmentsUpdate = async () => {
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
    }
    
    setShowJobAssignmentsModal(false)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'hr_manager': return 'default'
      case 'hiring_manager': return 'secondary'
      case 'interviewer': return 'outline'
      case 'recruiter': 
      default: return 'default'
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getAccessBadgeVariant = (accessType: string) => {
    switch (accessType) {
      case 'admin': return 'destructive'
      case 'write': return 'default'
      case 'read': return 'secondary'
      default: return 'outline'
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Users ({filteredUsers.length})
              </CardTitle>
              <Button onClick={() => setShowAddUserModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {user.first_name.charAt(0)}{user.last_name?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                        {formatRole(user.role)}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No users found matching your search
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Details & Job Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedUser ? `${selectedUser.first_name}'s Job Assignments` : 'Select a User'}
              </CardTitle>
              {selectedUser && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageJobAssignments}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Access
                  </Button>
                  {selectedUser.role !== 'admin' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(selectedUser.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div>
                {/* Job Assignments */}
                <div>
                  <h4 className="font-medium mb-3">Job Access ({userJobs.length})</h4>
                  {selectedUser.role === 'admin' ? (
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="text-blue-800 font-medium">Admin Access</div>
                      <div className="text-blue-600 text-sm">
                        This user has admin privileges and can access all jobs
                      </div>
                    </div>
                  ) : userJobs.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userJobs.map((jobAccess) => (
                        <div
                          key={jobAccess.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{jobAccess.job_title}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                      <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <div>No job assignments</div>
                      <div className="text-sm">Click "Manage Access" to assign jobs</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">Select a User</div>
                <div>Choose a user from the list to view and manage their job assignments</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
