'use client'

import { useState, useEffect } from 'react'
import { 
  Button, 
  Chip, 
  Input, 
  FormLabel, 
  Checkbox,
  Avatar,
  Box,
  Text,
  Heading,
  CircleLoader
} from '@sparrowengg/twigs-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, Settings, Trash2, Plus, Users } from 'lucide-react'
import { UserJobAccessApi, type UserJobAccess } from '@/lib/api/user-job-access'
import { type User } from '@/lib/api/users'
import { type JobOpeningListItem } from '@/lib/job-types'
import { toast } from '@/hooks/use-toast'

interface JobUserAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  job: JobOpeningListItem
  jobUsers: UserJobAccess[]
  allUsers: User[]
  onUpdate: () => void
}

export function JobUserAssignmentsModal({
  isOpen,
  onClose,
  job,
  jobUsers,
  allUsers,
  onUpdate
}: JobUserAssignmentsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<{ [userId: string]: string }>({}) // userId -> access_type
  const [currentJobUsers, setCurrentJobUsers] = useState<UserJobAccess[]>([]) // Local copy that we can modify
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingAccess, setRemovingAccess] = useState<string | null>(null)
  const [showAddUsers, setShowAddUsers] = useState(false)

  // Initialize selected users and current job users when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialSelected: { [userId: string]: string } = {}
      jobUsers.forEach(userAccess => {
        initialSelected[userAccess.user_id] = userAccess.access_type
      })
      setSelectedUsers(initialSelected)
      setCurrentJobUsers([...jobUsers]) // Create a local copy
      setShowAddUsers(false)
    }
  }, [isOpen, jobUsers])

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      // Add user immediately when checked
      setSelectedUsers(prev => ({
        ...prev,
        [userId]: 'read' // Default access type
      }))
      
      // Add temporary user access record for immediate UI update
      const user = allUsers.find(u => u.id === userId)
      const tempUserAccess: UserJobAccess = {
        id: `temp-${userId}`, // Temporary ID
        user_id: userId,
        job_opening_id: job.id,
        access_type: 'read' as const,
        user_name: `${user?.first_name} ${user?.last_name || ''}`.trim(),
        user_email: user?.email || '',
        job_title: job.posting_title
      }
      
      setCurrentJobUsers(prev => [...prev, tempUserAccess])
    } else {
      // Remove user immediately when unchecked
      setSelectedUsers(prev => {
        const newSelected = { ...prev }
        delete newSelected[userId]
        return newSelected
      })
      
      // Remove from current job users list
      setCurrentJobUsers(prev => prev.filter(user => user.user_id !== userId))
    }
  }

  const handleAccessTypeChange = (userId: string, accessType: string) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: accessType
    }))
  }

  const handleRemoveAccess = async (accessId: string, userId: string) => {
    setRemovingAccess(accessId)
    try {
      await UserJobAccessApi.deleteUserJobAccess(accessId)
      
      // Update local state immediately to reflect the change in UI
      setSelectedUsers(prev => {
        const newSelected = { ...prev }
        delete newSelected[userId]
        return newSelected
      })
      
      // Remove from current job users list
      setCurrentJobUsers(prev => prev.filter(user => user.user_id !== userId))
      
      toast({
        title: "Success",
        description: "User access removed successfully"
      })
      
      // Notify parent component to refresh its data
      onUpdate()
    } catch (error) {
      console.error('Error removing user access:', error)
      toast({
        title: "Error",
        description: "Failed to remove user access",
        variant: "destructive"
      })
    } finally {
      setRemovingAccess(null)
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      // Filter out temporary records from currentJobUsers for comparison
      const realCurrentUsers = currentJobUsers.filter(user => !user.id.startsWith('temp-'))
      
      // Get current user assignments
      const currentUserIds = new Set(realCurrentUsers.map(user => user.user_id))
      const selectedUserIds = new Set(Object.keys(selectedUsers))

      // Users to add (in selectedUsers but not in realCurrentUsers)
      const usersToAdd = Array.from(selectedUserIds).filter(userId => !currentUserIds.has(userId))
      
      // Users to update (existing users with different access types)
      const usersToUpdate = realCurrentUsers.filter(user => 
        selectedUserIds.has(user.user_id) && 
        selectedUsers[user.user_id] !== user.access_type
      )

      // Users to remove (in realCurrentUsers but not in selectedUsers)
      const usersToRemove = realCurrentUsers.filter(user => !selectedUserIds.has(user.user_id))

      console.log('Save operation:', {
        realCurrentUsers: realCurrentUsers.length,
        selectedUsers: Object.keys(selectedUsers).length,
        usersToAdd: usersToAdd.length,
        usersToUpdate: usersToUpdate.length,
        usersToRemove: usersToRemove.length,
        usersToAddList: usersToAdd
      })

      // Add new user assignments
      for (const userId of usersToAdd) {
        await UserJobAccessApi.createUserJobAccess({
          user_id: userId,
          job_opening_id: job.id,
          access_type: selectedUsers[userId] as 'read' | 'write' | 'admin'
        })
      }

      // Update existing user assignments
      for (const user of usersToUpdate) {
        await UserJobAccessApi.updateUserJobAccess(user.id, {
          access_type: selectedUsers[user.user_id] as 'read' | 'write' | 'admin'
        })
      }

      // Remove user assignments
      for (const user of usersToRemove) {
        await UserJobAccessApi.deleteUserJobAccess(user.id)
      }

      toast({
        title: "Success",
        description: "User assignments updated successfully"
      })
      
      onUpdate()
    } catch (error) {
      console.error('Error updating user assignments:', error)
      toast({
        title: "Error",
        description: "Failed to update user assignments",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
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

  // Filter out admin users from the available users list since they have access to all jobs
  const nonAdminUsers = allUsers.filter(user => user.role !== 'admin')
  
  const filteredUsers = nonAdminUsers.filter(user =>
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] min-h-[700px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage User Access - {job.posting_title}
          </DialogTitle>
          <DialogDescription>
            Select users and set their access levels for this job. Admin users automatically have access to all jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              css={{ paddingLeft: '$18' }}
            />
          </div>

            {/* Current Assignments */}
            <div className="flex-shrink-0">
              <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$3' }}>
                <Text size="sm" weight="medium">Current User Assignments ({currentJobUsers.length})</Text>
                <Button
                  variant="solid"
                  color="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setShowAddUsers(true)}
                >
                  Add Users
                </Button>
              </Box>
              
              {currentJobUsers.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {currentJobUsers.map((userAccess) => (
                    <div key={userAccess.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">{userAccess.user_name}</div>
                          <div className="text-xs text-gray-500">{userAccess.user_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedUsers[userAccess.user_id] || userAccess.access_type}
                          onValueChange={(value) => handleAccessTypeChange(userAccess.user_id, value)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="write">Write</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAccess(userAccess.id, userAccess.user_id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          disabled={removingAccess === userAccess.id}
                        >
                          {removingAccess === userAccess.id ? (
                            <CircleLoader size="xs" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <div>No user assignments</div>
                  <div className="text-sm">Click "Add Users" to assign users to this job</div>
                </div>
              )}
            </div>

            {/* Add Users Section */}
            {showAddUsers && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <Label className="text-sm font-medium">Select Users to Add</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddUsers(false)}
                  >
                    Done
                  </Button>
                </div>

                {/* Search */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search available users..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    css={{ paddingLeft: '$18' }}
                  />
                </div>

                {/* Available Users */}
                <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
                  {filteredUsers
                    .filter(user => !currentJobUsers.some(ua => ua.user_id === user.id))
                    .map((user) => {
                      const isSelected = selectedUsers.hasOwnProperty(user.id)
                      return (
                        <div key={user.id} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked: boolean) => handleUserToggle(user.id, checked)}
                          />
                          <Avatar 
                            size="sm" 
                            name={`${user.first_name} ${user.last_name || ''}`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                          <Chip 
                            color={getRoleBadgeVariant(user.role) === 'destructive' ? 'error' : 'default'} 
                            size="sm"
                          >
                            {formatRole(user.role)}
                          </Chip>
                        </div>
                      )
                    })}
                  {filteredUsers.filter(user => !currentJobUsers.some(ua => ua.user_id === user.id)).length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      {searchQuery ? 'No users found matching your search' : 'All users are already assigned to this job'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
