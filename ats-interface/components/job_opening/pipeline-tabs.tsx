"use client"

import { Users, Phone, Clock, AlertCircle, X } from "lucide-react"

interface PipelineTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PipelineTabs({ activeTab, onTabChange }: PipelineTabsProps) {
  const tabs = [
    { id: "all", label: "All applicants", icon: Users },
    { id: "contacted", label: "Contacted", icon: Phone },
    { id: "parked", label: "Park for later", icon: Clock },
    { id: "pending", label: "Action pending", icon: AlertCircle },
    { id: "rejected", label: "Rejected", icon: X },
  ]

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div
      className="p-2 rounded-lg border"
      style={{
        backgroundColor: "#F3F4F6",
        borderColor: "#E5E7EB",
      }}
    >
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id ? "shadow-sm" : "hover:bg-gray-100"
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? "#FFFFFF" : "transparent",
              color: activeTab === tab.id ? "#111827" : "#6B7280",
              fontSize: "14px",
              fontWeight: activeTab === tab.id ? 500 : 400,
              fontFamily,
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
