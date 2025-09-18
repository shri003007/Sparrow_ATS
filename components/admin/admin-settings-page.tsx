'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Briefcase } from 'lucide-react'
import { UserManagementView } from './user-management-view'
import { JobManagementView } from './job-management-view'

interface AdminSettingsPageProps {
  onClose?: () => void
}

export function AdminSettingsPage({ onClose }: AdminSettingsPageProps) {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
              <p className="text-gray-600 mt-1">Manage users and job access permissions</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Access Management
            </CardTitle>
            <CardDescription>
              Manage user permissions and job access at both user and job levels
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <Users className="w-4 h-4" />
                  User Management
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <Briefcase className="w-4 h-4" />
                  Job Management
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="mt-0">
                <UserManagementView />
              </TabsContent>
              
              <TabsContent value="jobs" className="mt-0">
                <JobManagementView />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
