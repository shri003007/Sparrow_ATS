"use client"

import React from "react"
import {
  Search,
  ChevronDown,
  BarChart3,
  Briefcase,
  Plus,
  Users,
  CreditCard,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface SidebarProps {
  jobRoles: string[];
  loadingRoles: boolean;
  activeJobRole: string;
  onJobRoleClick: (role: string) => void;
  onAddRoleClick: () => void;
}

export function Sidebar({
  jobRoles,
  loadingRoles,
  activeJobRole,
  onJobRoleClick,
  onAddRoleClick,
}: SidebarProps) {
  return (
    <div className="w-60 bg-gray-50 border border-gray-200 flex flex-col rounded-2xl shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-400 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">*</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600 text-sm font-medium">PRO</span>
            <span className="text-gray-900 text-sm font-medium">HighValueTeam</span>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search candidates by name" 
            className="pl-10 bg-white border-gray-200 text-sm rounded-xl"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">NAVIGATE</p>
          <nav className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </a>
            <div>
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <Briefcase className="w-4 h-4" />
                All roles
                <button onClick={onAddRoleClick}>
                  <Plus className="w-4 h-4 ml-auto hover:text-blue-600 cursor-pointer transition-colors" />
                </button>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {loadingRoles ? (
                  <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading roles...
                  </div>
                ) : (
                  <>
                    {/* Individual Job Roles */}
                    {jobRoles.map((role, index) => (
                      <button
                        key={role}
                        onClick={() => onJobRoleClick(role)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors w-full text-left ${
                          role === activeJobRole 
                            ? "bg-white border border-gray-200 shadow-sm" 
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          role === activeJobRole ? "bg-blue-500" : "bg-gray-400"
                        }`}></div>
                        {role}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => onJobRoleClick("All candidates")}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors w-full text-left"
            >
              <Users className="w-4 h-4" />
              All candidates
            </button>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Billing
            </a>
          </nav>
        </div>
      </div>
    </div>
  )
} 