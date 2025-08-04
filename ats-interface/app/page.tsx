"use client"

import { useState } from "react"
import { Settings, Check } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { PipelineTabs } from "@/components/pipeline-tabs"
import { CandidatesTable } from "@/components/candidates-table"
import { JobCreationModal } from "@/components/job-creation-modal"
import { JobCreationForm } from "@/components/job-creation-form"
import { TemplateSelectionModal } from "@/components/template-selection-modal"
import { AICreationModal } from "@/components/ai-creation-modal"
import { AILoadingModal } from "@/components/ai-loading-modal"
import { UploadModal } from "@/components/upload-modal"
import type { CreationMethod, JobTemplate, JobFormData } from "@/lib/job-types"
import type { HiringRound } from "@/lib/hiring-types"
import { HiringRoundsModal } from "@/components/hiring-rounds-modal"
import { HiringProcessCanvas } from "@/components/hiring-process-canvas"
import { JobPublishConfirmationModal } from "@/components/job-publish-confirmation-modal"

const mockCandidates = [
  {
    id: "1",
    name: "Sankalp Sinha",
    recommendation: { type: "highly" as const, label: "Highly recommended", score: 4.7, maxScore: 5 },
    status: "Action pending",
    experience: "13 yrs.",
  },
  {
    id: "2",
    name: "Maria Rodriguez",
    recommendation: { type: "highly" as const, label: "Highly recommended", score: 4.5, maxScore: 5 },
    status: "Action pending",
    experience: "8 yrs.",
  },
  {
    id: "3",
    name: "Sofia Kowalski",
    recommendation: { type: "highly" as const, label: "Highly recommended", score: 4.3, maxScore: 5 },
    status: "Action pending",
    experience: "8 yrs.",
  },
  {
    id: "4",
    name: "Yuki Tanaka",
    recommendation: { type: "good" as const, label: "Good hire", score: 4.1, maxScore: 5 },
    status: "Action pending",
    experience: "9 yrs.",
  },
  {
    id: "5",
    name: "Mei Lin",
    recommendation: { type: "good" as const, label: "Good hire", score: 4.0, maxScore: 5 },
    status: "Action pending",
    experience: "6 yrs.",
  },
  {
    id: "6",
    name: "Jamal Washington",
    recommendation: { type: "needs" as const, label: "Needs discussion", score: 3.9, maxScore: 5 },
    status: "Action pending",
    experience: "5 yrs.",
  },
  {
    id: "7",
    name: "Ahmed Mahmoud",
    recommendation: { type: "needs" as const, label: "Needs discussion", score: 3.9, maxScore: 5 },
    status: "Action pending",
    experience: "7 yrs.",
  },
  {
    id: "8",
    name: "Abhishek Petrov",
    recommendation: { type: "needs" as const, label: "Needs discussion", score: 3.6, maxScore: 5 },
    status: "Action pending",
    experience: "9 yrs.",
  },
]

type AppView = "dashboard" | "job-creation"
type JobCreationView = "form" | "canvas"

export default function ATSInterface() {
  const [activeTab, setActiveTab] = useState("all")
  const [appView, setAppView] = useState<AppView>("dashboard")
  const [jobCreationView, setJobCreationView] = useState<JobCreationView>("form")
  const [jobFormData, setJobFormData] = useState<Partial<JobFormData>>({})

  // Modal states
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAILoading, setShowAILoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const [showHiringRoundsModal, setShowHiringRoundsModal] = useState(false)
  const [selectedRounds, setSelectedRounds] = useState<HiringRound[]>([])
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false)

  const handleCreateJobClick = () => {
    setShowCreationModal(true)
  }

  const handleSelectCreationMethod = (method: CreationMethod) => {
    setShowCreationModal(false)
    setSelectedRounds([]) // Reset rounds for a new job

    switch (method) {
      case "scratch":
        setJobFormData({})
        setAppView("job-creation")
        setJobCreationView("form")
        break
      case "template":
        setShowTemplateModal(true)
        break
      case "ai":
        setShowAIModal(true)
        break
      case "upload":
        setShowUploadModal(true)
        break
    }
  }

  const handleTemplateSelect = (template: JobTemplate) => {
    setShowTemplateModal(false)
    setJobFormData({
      title: template.title,
      employmentType: template.employmentType,
      minExperience: template.minExperience,
      compensationType: "Salary Range",
      compensationAmount: "",
      currency: "INR",
      description: template.description,
    })
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handleAIGenerate = (prompt: string) => {
    setShowAIModal(false)
    setShowAILoading(true)

    setTimeout(() => {
      setShowAILoading(false)
      setJobFormData({
        title: "UI Designer",
        employmentType: "Part-time",
        minExperience: "3 years",
        compensationType: "Hourly Rate",
        compensationAmount: "100",
        currency: "USD",
        description:
          "We are looking for a talented UI Designer with expertise in micro-interactions and prototyping to join our remote team...",
      })
      setAppView("job-creation")
      setJobCreationView("form")
    }, 3000)
  }

  const handleFileUpload = (file: File) => {
    setShowUploadModal(false)
    setJobFormData({
      title: "Senior Software Engineer",
      employmentType: "Full-time",
      minExperience: "5 years",
      compensationType: "Salary Range",
      compensationAmount: "80,000 - 120,000",
      currency: "USD",
      description: "Parsed content from uploaded file...",
    })
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handlePasteText = (text: string) => {
    setShowUploadModal(false)
    setJobFormData({
      title: "Product Manager",
      employmentType: "Full-time",
      minExperience: "4 years",
      compensationType: "Salary Range",
      compensationAmount: "90,000 - 130,000",
      currency: "USD",
      description: text,
    })
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handleJobFormSubmit = (data: JobFormData) => {
    setJobFormData(data)
    if (selectedRounds.length > 0) {
      setJobCreationView("canvas")
    } else {
      setShowHiringRoundsModal(true)
    }
  }

  const handleRoundsContinue = (rounds: HiringRound[]) => {
    setSelectedRounds(rounds)
    setShowHiringRoundsModal(false)
    setJobCreationView("canvas")
  }

  const handleUpdateRounds = (rounds: HiringRound[]) => {
    setSelectedRounds(rounds)
  }

  const handlePublishJob = () => {
    setShowPublishConfirmation(true)
  }

  const handleConfirmPublish = () => {
    console.log("Job published:", { jobData: jobFormData, rounds: selectedRounds })
    setShowPublishConfirmation(false)
    setAppView("dashboard")
    setJobFormData({})
    setSelectedRounds([])
  }

  const renderJobCreationView = () => {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F9F9F7" }}>
        <AppSidebar />
        <div className="flex-1 overflow-y-auto">
          {jobCreationView === "form" && (
            <JobCreationForm
              initialData={jobFormData}
              onSubmit={handleJobFormSubmit}
              onBack={() => setAppView("dashboard")}
              hasRoundsConfigured={selectedRounds.length > 0}
            />
          )}
          {jobCreationView === "canvas" && (
            <HiringProcessCanvas
              rounds={selectedRounds}
              onUpdateRounds={handleUpdateRounds}
              onPublish={handlePublishJob}
              onBack={() => setJobCreationView("form")}
              jobTitle={jobFormData.title || ""}
            />
          )}
        </div>

        <HiringRoundsModal
          isOpen={showHiringRoundsModal}
          onClose={() => setShowHiringRoundsModal(false)}
          onContinue={handleRoundsContinue}
        />
        <JobPublishConfirmationModal
          isOpen={showPublishConfirmation}
          onClose={() => setShowPublishConfirmation(false)}
          onConfirm={handleConfirmPublish}
          jobData={jobFormData}
          rounds={selectedRounds}
        />
      </div>
    )
  }

  const renderDashboard = () => (
    <div className="flex h-screen" style={{ backgroundColor: "#F9F9F7" }}>
      <AppSidebar onCreateJob={handleCreateJobClick} />
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-8 py-6" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                style={{
                  color: "#6B7280",
                  fontSize: "14px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                All roles
              </span>
            </div>
            <div className="flex gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                style={{
                  borderColor: "#E5E7EB",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <Settings className="w-4 h-4" />
                Edit JD
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:bg-gray-800 transition-colors"
                style={{
                  backgroundColor: "#111827",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <Check className="w-4 h-4" />
                Mark closed
              </button>
            </div>
          </div>
          <div>
            <h1
              className="mb-2"
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              Staff Design Engg.
            </h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  366 people applied to this role
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  Role opened on 5 January 2025
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 px-8 py-6">
          <div className="mb-6">
            <PipelineTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <CandidatesTable candidates={mockCandidates} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {appView === "dashboard" && renderDashboard()}
      {appView === "job-creation" && renderJobCreationView()}

      {/* Global Modals */}
      <JobCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onSelectMethod={handleSelectCreationMethod}
      />
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
      <AICreationModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} onGenerate={handleAIGenerate} />
      <AILoadingModal isOpen={showAILoading} />
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleFileUpload}
        onPasteText={handlePasteText}
      />
    </>
  )
}
