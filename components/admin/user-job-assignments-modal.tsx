'use client'

import { useState, useEffect } from 'react'
import { 
  Button, 
  Chip, 
  Input, 
  FormLabel, 
  Checkbox,
  Box,
  Text,
  Heading
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
import { Search, Settings, Trash2, Plus, Briefcase } from 'lucide-react'
import { UserJobAccessApi, type UserJobAccess } from '@/lib/api/user-job-access'
import { type User } from '@/lib/api/users'
import { type JobOpeningListItem } from '@/lib/job-types'
import { toast } from '@/hooks/use-toast'

interface UserJobAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  userJobs: UserJobAccess[]
  allJobs: JobOpeningListItem[]
  onUpdate: () => void
}

export function UserJobAssignmentsModal({
  isOpen,
  onClose,
  user,
  userJobs,
  allJobs,
  onUpdate
}: UserJobAssignmentsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJobs, setSelectedJobs] = useState<{ [jobId: string]: string }>({}) // jobId -> access_type
  const [currentUserJobs, setCurrentUserJobs] = useState<UserJobAccess[]>([]) // Local copy that we can modify
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddJobs, setShowAddJobs] = useState(false)

  // Initialize selected jobs and current user jobs when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialSelected: { [jobId: string]: string } = {}
      userJobs.forEach(jobAccess => {
        initialSelected[jobAccess.job_opening_id] = jobAccess.access_type
      })
      setSelectedJobs(initialSelected)
      setCurrentUserJobs([...userJobs]) // Create a local copy
      setShowAddJobs(false)
    }
  }, [isOpen, userJobs])

  const handleNewJobToggle = (jobId: string, checked: boolean) => {
    if (checked) {
      // Add job immediately when checked
      setSelectedJobs(prev => ({
        ...prev,
        [jobId]: 'read' // Default access type
      }))
      
      // Add temporary job access record for immediate UI update
      const job = allJobs.find(j => j.id === jobId)
      const tempJobAccess: UserJobAccess = {
        id: `temp-${jobId}`, // Temporary ID
        user_id: user.id,
        job_opening_id: jobId,
        access_type: 'read' as const,
        user_name: `${user.first_name} ${user.last_name || ''}`.trim(),
        user_email: user.email,
        job_title: job?.posting_title || 'Unknown Job'
      }
      
      setCurrentUserJobs(prev => [...prev, tempJobAccess])
    } else {
      // Remove job immediately when unchecked
      setSelectedJobs(prev => {
        const newSelected = { ...prev }
        delete newSelected[jobId]
        return newSelected
      })
      
      // Remove from current user jobs list
      setCurrentUserJobs(prev => prev.filter(job => job.job_opening_id !== jobId))
    }
  }

  const handleAccessTypeChange = (jobId: string, accessType: string) => {
    setSelectedJobs(prev => ({
      ...prev,
      [jobId]: accessType
    }))
  }


  const handleRemoveAccess = async (accessId: string, jobId: string) => {
    try {
      await UserJobAccessApi.deleteUserJobAccess(accessId)
      
      // Update local state immediately to reflect the change in UI
      setSelectedJobs(prev => {
        const newSelected = { ...prev }
        delete newSelected[jobId]
        return newSelected
      })
      
      // Remove from current user jobs list
      setCurrentUserJobs(prev => prev.filter(job => job.id !== accessId))
      
      toast({
        title: "Success",
        description: "Job access removed successfully"
      })
      
      // Update parent component data immediately
      onUpdate()
    } catch (error) {
      console.error('Error removing job access:', error)
      toast({
        title: "Error",
        description: "Failed to remove job access",
        variant: "destructive"
      })
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      // Filter out temporary records (those with temp- IDs) to get real current jobs
      const realCurrentJobs = currentUserJobs.filter(job => !job.id.startsWith('temp-'))
      const currentJobIds = new Set(realCurrentJobs.map(job => job.job_opening_id))
      const selectedJobIds = new Set(Object.keys(selectedJobs))

      // Jobs to add (those selected but not in real current jobs)
      const jobsToAdd = Array.from(selectedJobIds).filter(jobId => !currentJobIds.has(jobId))
      
      // Jobs to update (only from real current jobs)
      const jobsToUpdate = realCurrentJobs.filter(job => 
        selectedJobIds.has(job.job_opening_id) && 
        selectedJobs[job.job_opening_id] !== job.access_type
      )

      // Jobs to remove (only from real current jobs)
      const jobsToRemove = realCurrentJobs.filter(job => !selectedJobIds.has(job.job_opening_id))

      console.log('Save operation:', {
        realCurrentJobs: realCurrentJobs.length,
        selectedJobs: Object.keys(selectedJobs).length,
        jobsToAdd: jobsToAdd.length,
        jobsToUpdate: jobsToUpdate.length,
        jobsToRemove: jobsToRemove.length,
        jobsToAddList: jobsToAdd
      })

      // Add new job assignments
      for (const jobId of jobsToAdd) {
        await UserJobAccessApi.createUserJobAccess({
          user_id: user.id,
          job_opening_id: jobId,
          access_type: selectedJobs[jobId] as 'read' | 'write' | 'admin'
        })
      }

      // Update existing job assignments
      for (const job of jobsToUpdate) {
        await UserJobAccessApi.updateUserJobAccess(job.id, {
          access_type: selectedJobs[job.job_opening_id] as 'read' | 'write' | 'admin'
        })
      }

      // Remove job assignments
      for (const job of jobsToRemove) {
        await UserJobAccessApi.deleteUserJobAccess(job.id)
      }

      toast({
        title: "Success",
        description: "Job assignments updated successfully"
      })
      
      onUpdate()
    } catch (error) {
      console.error('Error updating job assignments:', error)
      toast({
        title: "Error",
        description: "Failed to update job assignments",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
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

  const filteredJobs = allJobs.filter(job =>
    job.posting_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.job_status.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] min-h-[700px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Job Access - {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            Select jobs and set access levels for this user. Admin users automatically have access to all jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">{/* Main content wrapper */}

        {user.role === 'admin' ? (
          <div className="p-6 bg-blue-50 rounded-lg text-center">
            <div className="text-blue-800 font-medium mb-2">Admin User</div>
            <div className="text-blue-600 text-sm">
              This user has admin privileges and automatically has access to all jobs with admin permissions.
            </div>
          </div>
        ) : (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Current Assignments */}
              <div className="flex-shrink-0">
                <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '$3' }}>
                  <Text size="sm" weight="medium">Current Job Assignments ({currentUserJobs.length})</Text>
                  <Button
                    variant="solid"
                    color="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={() => setShowAddJobs(true)}
                  >
                    Add Jobs
                  </Button>
                </Box>
                
                {currentUserJobs.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {currentUserJobs.map((jobAccess) => (
                    <div key={jobAccess.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">{jobAccess.job_title}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedJobs[jobAccess.job_opening_id] || jobAccess.access_type}
                          onValueChange={(value) => handleAccessTypeChange(jobAccess.job_opening_id, value)}
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
                          onClick={() => handleRemoveAccess(jobAccess.id, jobAccess.job_opening_id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <div>No job assignments</div>
                  <div className="text-sm">Click "Add Jobs" to assign jobs to this user</div>
                </div>
              )}
            </div>

              {/* Add Jobs Section */}
              {showAddJobs && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <Label className="text-sm font-medium">Select Jobs to Add</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddJobs(false)}
                    >
                      Done
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search available jobs..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      css={{ paddingLeft: '$18' }}
                    />
                  </div>

                  {/* Available Jobs */}
                  <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
                    {filteredJobs
                      .filter(job => !currentUserJobs.some(ua => ua.job_opening_id === job.id))
                      .map((job) => {
                        const isSelected = selectedJobs.hasOwnProperty(job.id)
                        return (
                          <div key={job.id} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked: boolean) => handleNewJobToggle(job.id, checked)}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{job.posting_title}</div>
                              <div className="text-xs text-gray-500">
                                {job.job_status} • {job.employment_type.replace('_', ' ')}
                              </div>
                            </div>
                            <Chip color="neutral" size="sm">
                              {job.job_status}
                            </Chip>
                          </div>
                        )
                      })}
                    {filteredJobs.filter(job => !currentUserJobs.some(ua => ua.job_opening_id === job.id)).length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        {searchQuery ? 'No jobs found matching your search' : 'All jobs are already assigned to this user'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {user.role !== 'admin' && (
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
