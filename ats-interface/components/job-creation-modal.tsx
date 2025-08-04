"use client"

import { X, Edit3, FileText, Sparkles, Upload } from "lucide-react"
import type { CreationMethod } from "@/lib/job-types"

interface JobCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMethod: (method: CreationMethod) => void
}

export function JobCreationModal({ isOpen, onClose, onSelectMethod }: JobCreationModalProps) {
  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const creationOptions = [
    {
      id: "scratch" as CreationMethod,
      title: "Start from Scratch",
      description: "Fill out job details manually.",
      icon: Edit3,
      iconColor: "#6B7280",
    },
    {
      id: "template" as CreationMethod,
      title: "Use a Template",
      description: "Pick from saved templates.",
      icon: FileText,
      iconColor: "#8B5CF6",
    },
    {
      id: "ai" as CreationMethod,
      title: "Create with AI",
      description: "Generate a JD from a title.",
      icon: Sparkles,
      iconColor: "#F59E0B",
    },
    {
      id: "upload" as CreationMethod,
      title: "Upload a JD",
      description: "Parse an existing document.",
      icon: Upload,
      iconColor: "#10B981",
    },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-xl font-semibold"
              style={{
                color: "#111827",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              Create Job Opening
            </h2>
            <p
              className="text-sm mt-1"
              style={{
                color: "#6B7280",
                fontSize: "14px",
              }}
            >
              How would you like to begin?
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {creationOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectMethod(option.id)}
              className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
              style={{
                borderColor: "#E5E7EB",
              }}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${option.iconColor}15` }}>
                  <option.icon className="w-6 h-6" style={{ color: option.iconColor }} />
                </div>
                <div>
                  <h3
                    className="font-medium"
                    style={{
                      color: "#111827",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {option.title}
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: "#6B7280",
                      fontSize: "12px",
                    }}
                  >
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
