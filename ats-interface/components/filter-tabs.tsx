"use client"

import { Users, Phone, Clock, AlertCircle, X } from "lucide-react"

interface FilterTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  const tabs = [
    { id: "all", label: "All applicants", icon: Users },
    { id: "contacted", label: "Contacted", icon: Phone },
    { id: "parked", label: "Park for later", icon: Clock },
    { id: "pending", label: "Action pending", icon: AlertCircle },
    { id: "rejected", label: "Rejected", icon: X },
  ]

  return (
    <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
