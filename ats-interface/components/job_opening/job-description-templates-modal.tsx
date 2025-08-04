"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"

interface JobDescriptionTemplate {
  id: string
  title: string
  summary: string
  responsibilities: string[]
  fullDescription: string
}

interface JobDescriptionTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (description: string) => void
}

const mockJobDescriptions: JobDescriptionTemplate[] = [
  {
    id: "1",
    title: "Product Manager",
    summary:
      "The Product Manager in the Internet and New Media industry is responsible for overseeing the development, marketing, promotion, and support of the company's products or services. The ideal candidate should have a strong technical understanding of software and hardware technologies, infrastructure, and cloud services, as well as experience in product management and agile methodologies.",
    responsibilities: [
      "Develop a comprehensive product vision, strategy, and roadmap",
      "Define user personas and customer requirements",
      "Conduct market research, competitive analysis, and customer feedback analysis",
      "Collaborate with cross-functional teams",
      "Develop and maintain product backlog, user stories, acceptance criteria, and documentation",
      "Review and prioritize product features",
      "Work with the engineering team to ensure product development meets quality standards",
      "Work with the sales and marketing teams to develop product positioning, messaging, pricing, and go-to-market strategy",
      "Collaborate with the customer support team to ensure product support and customer satisfaction",
      "Continuously monitor product performance through key metrics and feedback",
    ],
    fullDescription:
      "The Product Manager in the Internet and New Media industry is responsible for overseeing the development, marketing, promotion, and support of the company's products or services. The ideal candidate should have a strong technical understanding of software and hardware technologies, infrastructure, and cloud services, as well as experience in product management and agile methodologies.\n\nResponsibilities:\n• Develop a comprehensive product vision, strategy, and roadmap\n• Define user personas and customer requirements\n• Conduct market research, competitive analysis, and customer feedback analysis\n• Collaborate with cross-functional teams\n• Develop and maintain product backlog, user stories, acceptance criteria, and documentation\n• Review and prioritize product features\n• Work with the engineering team to ensure product development meets quality standards\n• Work with the sales and marketing teams to develop product positioning, messaging, pricing, and go-to-market strategy\n• Collaborate with the customer support team to ensure product support and customer satisfaction\n• Continuously monitor product performance through key metrics and feedback",
  },
  {
    id: "2",
    title: "Assistant Production Manager",
    summary:
      "Support the Production Manager in overseeing daily production operations, ensuring quality standards and efficiency targets are met.",
    responsibilities: [
      "Assist in production planning and scheduling",
      "Monitor production processes and quality control",
      "Coordinate with different departments",
      "Maintain production records and reports",
    ],
    fullDescription:
      "Support the Production Manager in overseeing daily production operations, ensuring quality standards and efficiency targets are met.\n\nResponsibilities:\n• Assist in production planning and scheduling\n• Monitor production processes and quality control\n• Coordinate with different departments\n• Maintain production records and reports",
  },
  {
    id: "3",
    title: "Assistant Product Manager",
    summary:
      "Support the Product Manager in product development lifecycle, market research, and cross-functional collaboration.",
    responsibilities: [
      "Assist in product roadmap development",
      "Conduct market and competitive analysis",
      "Support user research initiatives",
      "Collaborate with engineering and design teams",
    ],
    fullDescription:
      "Support the Product Manager in product development lifecycle, market research, and cross-functional collaboration.\n\nResponsibilities:\n• Assist in product roadmap development\n• Conduct market and competitive analysis\n• Support user research initiatives\n• Collaborate with engineering and design teams",
  },
  {
    id: "4",
    title: "Associate Product Manager",
    summary:
      "Entry-level product management role focused on learning product strategy, user research, and cross-functional collaboration.",
    responsibilities: [
      "Support product discovery and research",
      "Assist in feature specification and documentation",
      "Participate in agile development processes",
      "Analyze product metrics and user feedback",
    ],
    fullDescription:
      "Entry-level product management role focused on learning product strategy, user research, and cross-functional collaboration.\n\nResponsibilities:\n• Support product discovery and research\n• Assist in feature specification and documentation\n• Participate in agile development processes\n• Analyze product metrics and user feedback",
  },
  {
    id: "5",
    title: "Senior Product Manager",
    summary:
      "Lead product strategy and execution for complex products, mentor junior team members, and drive cross-functional initiatives.",
    responsibilities: [
      "Define and execute comprehensive product strategy",
      "Lead cross-functional product teams",
      "Mentor junior product managers",
      "Drive product innovation and market expansion",
    ],
    fullDescription:
      "Lead product strategy and execution for complex products, mentor junior team members, and drive cross-functional initiatives.\n\nResponsibilities:\n• Define and execute comprehensive product strategy\n• Lead cross-functional product teams\n• Mentor junior product managers\n• Drive product innovation and market expansion",
  },
]

export function JobDescriptionTemplatesModal({ isOpen, onClose, onSelect }: JobDescriptionTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<JobDescriptionTemplate | null>(mockJobDescriptions[0])
  const [searchQuery, setSearchQuery] = useState("")

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const filteredTemplates = mockJobDescriptions.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.fullDescription)
    }
  }

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
            Job Description Templates
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Similar Jobs */}
          <div className="w-1/3 border-r p-6" style={{ borderColor: "#E5E7EB" }}>
            <h3
              className="font-medium mb-4"
              style={{
                color: "#111827",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Similar jobs
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
                placeholder="Search job descriptions..."
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
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                    selectedTemplate?.id === template.id ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                  }`}
                  style={{
                    borderWidth: selectedTemplate?.id === template.id ? "1px" : "0",
                    borderColor: selectedTemplate?.id === template.id ? "#DBEAFE" : "transparent",
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedTemplate?.id === template.id ? "border-blue-600" : "border-gray-300"
                    }`}
                  >
                    {selectedTemplate?.id === template.id && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#2563EB" }} />
                    )}
                  </div>
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

          {/* Right Panel - Description Preview */}
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
                  Description
                </h3>

                <div className="space-y-6">
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
                        lineHeight: "1.6",
                      }}
                    >
                      {selectedTemplate.summary}
                    </p>
                  </div>

                  <div>
                    <h4
                      className="font-medium mb-3"
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Responsibilities:
                    </h4>
                    <ul className="space-y-2">
                      {selectedTemplate.responsibilities.map((responsibility, index) => (
                        <li
                          key={index}
                          className="flex items-start"
                          style={{
                            color: "#374151",
                            fontSize: "14px",
                            lineHeight: "1.6",
                          }}
                        >
                          <span className="mr-2 mt-1">•</span>
                          <span>{responsibility}</span>
                        </li>
                      ))}
                    </ul>
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
            Cancel
          </button>
          <button
            onClick={handleSelect}
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
