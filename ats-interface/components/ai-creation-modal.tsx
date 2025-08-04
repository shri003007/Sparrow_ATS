"use client"

import { useState } from "react"
import { X, Sparkles } from "lucide-react"

interface AICreationModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (prompt: string) => void
}

export function AICreationModal({ isOpen, onClose, onGenerate }: AICreationModalProps) {
  const [prompt, setPrompt] = useState("")

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "#FEF3C7" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#F59E0B" }} />
            </div>
            <h2
              className="text-xl font-semibold"
              style={{
                color: "#111827",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Create with AI
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p
            style={{
              color: "#6B7280",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Include a brief job overview to assist our AI in crafting a job for you
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="- Looking for a part time UI Designer with expertise in micro-interaction and prototyping.&#10;- 100$/hour&#10;- remote"
            rows={6}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            style={{
              borderColor: "#E5E7EB",
              fontSize: "14px",
            }}
          />

          <div className="flex items-center justify-between">
            <span
              style={{
                color: "#9CA3AF",
                fontSize: "12px",
              }}
            >
              {prompt.length}/500 characters
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="px-6 py-2 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#6366F1",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Generate with AI
          </button>
        </div>
      </div>
    </div>
  )
}
