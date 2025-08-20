"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload } from "lucide-react"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => void
  onPasteText: (text: string) => void
}

export function UploadModal({ isOpen, onClose, onUpload, onPasteText }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")
  const [pastedText, setPastedText] = useState("")

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  const handlePaste = () => {
    if (pastedText.trim()) {
      onPasteText(pastedText)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold"
            style={{
              color: "#111827",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Create new role
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b" style={{ borderColor: "#E5E7EB" }}>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upload"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontSize: "14px" }}
          >
            Upload JD
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "paste"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontSize: "14px" }}
          >
            Paste JD as text
          </button>
        </div>

        {/* Content */}
        {activeTab === "upload" ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-300 transition-colors"
              style={{ borderColor: "#E5E7EB" }}
            >
              <Upload className="w-8 h-8 mx-auto mb-4" style={{ color: "#9CA3AF" }} />
              <p
                className="mb-2"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Drop your file here
              </p>
              <p
                className="text-sm mb-4"
                style={{
                  color: "#6B7280",
                  fontSize: "12px",
                }}
              >
                Supports PDF, DOC, DOCX files
              </p>
              <label className="inline-block">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                <span
                  className="px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: "#E5E7EB",
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Browse files
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your job description here..."
              rows={8}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              style={{
                borderColor: "#E5E7EB",
                fontSize: "14px",
              }}
            />
          </div>
        )}

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
            onClick={activeTab === "upload" ? () => {} : handlePaste}
            disabled={activeTab === "paste" && !pastedText.trim()}
            className="px-6 py-2 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#6366F1",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {activeTab === "upload" ? "Process JD" : "Process Text"}
          </button>
        </div>
      </div>
    </div>
  )
}
