'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Box, Heading, Text, Button } from '@sparrowengg/twigs-react'
import { Users, Briefcase, ArrowLeft } from 'lucide-react'
import { UserManagementView } from './user-management-view'
import { JobManagementView } from './job-management-view'

interface AdminSettingsPageProps {
  onClose?: () => void
}

export function AdminSettingsPage({ onClose }: AdminSettingsPageProps) {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <Box css={{ height: '100vh', backgroundColor: '$neutral25', padding: '$6', overflow: 'hidden' }}>
      <Box css={{ maxWidth: '7xl', margin: '0 auto' }}>
        {/* Header */}
        <Box css={{ marginBottom: '$4' }}>
          <Box css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Heading size="2xl" weight="bold" css={{ color: '$neutral800', marginBottom: '$1' }}>
                Admin Settings
              </Heading>
            </Box>
            {onClose && (
              <Button
                variant="ghost"
                size="lg"
                leftIcon={<ArrowLeft />}
                onClick={onClose}
              >
                Back to Dashboard
              </Button>
            )}
          </Box>
        </Box>

        {/* Main Content */}
        <Box css={{ 
          backgroundColor: 'white', 
          borderRadius: '$md', 
          boxShadow: '$sm',
          border: '1px solid $neutral200',
          height: 'calc(100vh - 100px)', // Even more height for tabs content
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {/* Tabs Content */}
          <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <TabsList css={{ 
                width: '100%', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                borderRadius: '0',
                backgroundColor: '$neutral50',
                borderBottom: '1px solid $neutral200',
                flexShrink: 0
              }}>
              <TabsTrigger 
                value="users"
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '$2',
                  borderRadius: '0',
                  '&[data-state=active]': {
                    backgroundColor: 'white',
                    borderBottom: '2px solid $primary500',
                    boxShadow: 'none'
                  }
                }}
              >
                <Users size={16} />
                User Management
              </TabsTrigger>
              <TabsTrigger 
                value="jobs"
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '$2',
                  borderRadius: '0',
                  '&[data-state=active]': {
                    backgroundColor: 'white',
                    borderBottom: '2px solid $primary500',
                    boxShadow: 'none'
                  }
                }}
              >
                <Briefcase size={16} />
                Job Management
              </TabsTrigger>
            </TabsList>
              
              <TabsContent value="users" css={{ margin: '0', flex: 1, overflow: 'hidden' }}>
                <UserManagementView />
              </TabsContent>
              
              <TabsContent value="jobs" css={{ margin: '0', flex: 1, overflow: 'hidden' }}>
                <JobManagementView />
              </TabsContent>
            </Tabs>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
