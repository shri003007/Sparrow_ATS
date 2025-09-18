'use client'

import { useState } from 'react'
import { 
  Button, 
  Input, 
  FormLabel,
  Box,
  Text
} from '@sparrowengg/twigs-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (userData: { email: string; first_name: string; last_name?: string }) => Promise<void>
}

export function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.first_name) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAdd({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name || undefined
      })
      
      // Reset form
      setFormData({
        email: '',
        first_name: '',
        last_name: ''
      })
    } catch (error) {
      console.error('Error adding user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: ''
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Box css={{ display: 'flex', alignItems: 'center', gap: '$2' }}>
              <UserPlus size={20} />
              Add New User
            </Box>
          </DialogTitle>
          <DialogDescription>
            <Text color="$neutral600" size="sm">
              Add a new recruiter to the system. They will be created with recruiter role by default.
            </Text>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Box css={{ display: 'flex', flexDirection: 'column', gap: '$4', padding: '$4 0' }}>
            <Box css={{ display: 'flex', flexDirection: 'column', gap: '$2' }}>
              <FormLabel htmlFor="email">Email Address *</FormLabel>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@surveysparrow.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Box>
            
            <Box css={{ display: 'flex', flexDirection: 'column', gap: '$2' }}>
              <FormLabel htmlFor="first_name">First Name *</FormLabel>
              <Input
                id="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </Box>
            
            <Box css={{ display: 'flex', flexDirection: 'column', gap: '$2' }}>
              <FormLabel htmlFor="last_name">Last Name</FormLabel>
              <Input
                id="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </Box>
          </Box>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="solid"
              color="primary"
              disabled={isSubmitting || !formData.email || !formData.first_name}
            >
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
