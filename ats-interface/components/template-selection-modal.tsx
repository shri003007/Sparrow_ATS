"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"
import type { JobTemplate } from "@/lib/job-types"

interface TemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: JobTemplate) => void
}

const mockTemplates: JobTemplate[] = [
  {
    id: "1",
    title: "Staff Design Engg.",
    employmentType: "Full-time",
    minExperience: "8+ years",
    compensation: "Confidential",
    summary:
      "The Staff Design Engineer is a key technical leader responsible for the most complex projects and provides architectural guidance across multiple teams.",
    description:
      "The Staff Design Engineer is a key technical leader responsible for the most complex projects and provides architectural guidance across multiple teams.",
    responsibilities: [
      "Lead the design and architecture of large-scale systems",
      "Mentor senior and junior engineers across the organization",
      "Collaborate with product leadership to define technical strategy",
      "Drive technical innovation and advocate for best practices",
    ],
  },
  {
    id: "2",
    title: "Sr. Frontend Engg.",
    employmentType: "Full-time",
    minExperience: "5+ years",
    compensation: "₹15-25 LPA",
    summary: "Senior Frontend Engineer responsible for building scalable web applications.",
    description: "Senior Frontend Engineer responsible for building scalable web applications.",
    responsibilities: [
      "Build responsive web applications",
      "Collaborate with design team",
      "Optimize application performance",
    ],
  },
  {
    id: "3",
    title: "Sr. Product Manager",
    employmentType: "Full-time",
    minExperience: "6+ years",
    compensation: "₹20-30 LPA",
    summary: "Senior Product Manager to drive product strategy and execution.",
    description: "Senior Product Manager to drive product strategy and execution.",
    responsibilities: ["Define product roadmap", "Work with engineering teams", "Analyze market trends"],
  },
]

export function TemplateSelectionModal({ isOpen, onClose, onSelect }: TemplateSelectionModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(mockTemplates[0])
  const [searchQuery, setSearchQuery] = useState("")

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const filteredTemplates = mockTemplates.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl mx-4 h-[80vh] flex flex-col" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#E5E7EB" }}>
          <h2
            className="text-xl font-semibold"
            style={{
              color: "#111827",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Job Opening Templates
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Template List */}
          <div className="w-1/3 border-r p-6" style={{ borderColor: "#E5E7EB" }}>
            <h3
              className="font-medium mb-4"
              style={{
                color: "#111827",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Select a Template
            </h3>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: "#9CA3AF" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{
                  borderColor: "#E5E7EB",
                  fontSize: "14px",
                }}
              />
            </div>

            {/* Template List */}
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTemplate?.id === template.id ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                  }`}
                  style={{
                    borderWidth: selectedTemplate?.id === template.id ? "1px" : "0",
                    borderColor: selectedTemplate?.id === template.id ? "#DBEAFE" : "transparent",
                  }}
                >
                  <div
                    className="font-medium"
                    style={{
                      color: selectedTemplate?.id === template.id ? "#1D4ED8" : "#111827",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {template.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel - Template Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedTemplate && (
              <>
                <h3
                  className="font-medium mb-6"
                  style={{
                    color: "#111827",
                    fontSize: "16px",
                    fontWeight: 500,
                  }}
                >
                  Template Preview
                </h3>

                <div className="space-y-6">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label
                        className="block text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{
                          color: "#6B7280",
                          fontSize: "11px",
                        }}
                      >
                        Job Title
                      </label>
                      <p
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                          fontWeight: 500,
                        }}
                      >
                        {selectedTemplate.title}
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{
                          color: "#6B7280",
                          fontSize: "11px",
                        }}
                      >
                        Employment Type
                      </label>
                      <p
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                        }}
                      >
                        {selectedTemplate.employmentType}
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{
                          color: "#6B7280",
                          fontSize: "11px",
                        }}
                      >
                        Min. Experience
                      </label>
                      <p
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                        }}
                      >
                        {selectedTemplate.minExperience}
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-medium mb-1 uppercase tracking-wide"
                        style={{
                          color: "#6B7280",
                          fontSize: "11px",
                        }}
                      >
                        Compensation
                      </label>
                      <p
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                        }}
                      >
                        {selectedTemplate.compensation}
                      </p>
                    </div>
                  </div>

                  {/* Job Description */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-3 uppercase tracking-wide"
                      style={{
                        color: "#6B7280",
                        fontSize: "11px",
                      }}
                    >
                      Job Description
                    </label>

                    <div className="space-y-4">
                      <div>
                        <h4
                          className="font-medium mb-2"
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          Summary:
                        </h4>
                        <p
                          style={{
                            color: "#374151",
                            fontSize: "14px",
                            lineHeight: "1.5",
                          }}
                        >
                          {selectedTemplate.summary}
                        </p>
                      </div>

                      <div>
                        <h4
                          className="font-medium mb-2"
                          style={{
                            color: "#111827",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          Responsibilities:
                        </h4>
                        <ul className="space-y-1">
                          {selectedTemplate.responsibilities.map((responsibility, index) => (
                            <li
                              key={index}
                              className="flex items-start"
                              style={{
                                color: "#374151",
                                fontSize: "14px",
                                lineHeight: "1.5",
                              }}
                            >
                              <span className="mr-2">•</span>
                              {responsibility}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: "#E5E7EB" }}>
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
            Back
          </button>
          <button
            onClick={() => selectedTemplate && onSelect(selectedTemplate)}
            disabled={!selectedTemplate}
            className="px-6 py-2 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#6366F1",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}
