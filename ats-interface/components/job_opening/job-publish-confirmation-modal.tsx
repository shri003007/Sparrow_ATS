"use client"

import { X, CheckCircle, ArrowRight, Loader2 } from "lucide-react"
import type { HiringRound } from "@/lib/hiring-types"
import type { JobFormData } from "@/lib/job-types"

interface JobPublishConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  jobData: Partial<JobFormData>
  rounds: HiringRound[]
  isPublishing?: boolean
}

export function JobPublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  jobData,
  rounds,
  isPublishing = false,
}: JobPublishConfirmationModalProps) {
  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#ECFDF5" }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: "#10B981" }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{
                  color: "#111827",
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                Ready to Publish Job
              </h2>
              <p
                className="text-sm mt-1"
                style={{
                  color: "#6B7280",
                  fontSize: "14px",
                }}
              >
                Review your job details before publishing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Job Title */}
          <div className="mb-6">
            <h3
              className="text-2xl font-bold mb-2"
              style={{
                color: "#111827",
                fontSize: "24px",
                fontWeight: 700,
              }}
            >
              {jobData.title || "Untitled Job"}
            </h3>
            <div className="flex items-center gap-4 text-sm" style={{ color: "#6B7280" }}>
              <span>{jobData.employmentType}</span>
              <span>•</span>
              <span>{jobData.minExperience} experience</span>
              <span>•</span>
              <span>
                {jobData.compensationAmount} {jobData.currency}
              </span>
            </div>
          </div>

          {/* Hiring Pipeline */}
          <div className="mb-6">
            <h4
              className="font-medium mb-4"
              style={{
                color: "#111827",
                fontSize: "16px",
                fontWeight: 500,
              }}
            >
              Hiring Pipeline ({rounds.length} rounds)
            </h4>

            {/* Pipeline Visualization */}
            <div className="relative">
              {/* Horizontal Scrollable Pipeline */}
              <div className="overflow-x-auto pb-4">
                <div className="flex items-center gap-3 min-w-max">
                  {rounds.map((round, index) => (
                    <div key={round.id} className="flex items-center">
                      {/* Round Card */}
                      <div
                        className="px-4 py-3 rounded-lg border text-center flex-shrink-0"
                        style={{
                          borderColor: "#E5E7EB",
                          backgroundColor: "#F9FAFB",
                          minWidth: "160px",
                          maxWidth: "160px",
                        }}
                      >
                        <div
                          className="text-xs font-medium mb-1"
                          style={{
                            color: "#6B7280",
                            fontSize: "11px",
                          }}
                        >
                          Round {index + 1}
                        </div>
                        <div
                          className="font-medium text-sm truncate"
                          style={{
                            color: "#111827",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                          title={round.name}
                        >
                          {round.name}
                        </div>
                        <div
                          className="text-xs mt-1"
                          style={{
                            color: "#9CA3AF",
                            fontSize: "11px",
                          }}
                        >
                          {round.competencies.length} competenc{round.competencies.length === 1 ? "y" : "ies"}
                        </div>
                      </div>

                      {/* Arrow */}
                      {index < rounds.length - 1 && (
                        <div className="flex items-center justify-center mx-3 flex-shrink-0">
                          <ArrowRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Stats - Remove Questions */}
              <div
                className="grid grid-cols-2 gap-4 p-4 rounded-lg mt-4"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                }}
              >
                <div className="text-center">
                  <div
                    className="text-lg font-semibold"
                    style={{
                      color: "#111827",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    {rounds.length}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: "#6B7280",
                      fontSize: "12px",
                    }}
                  >
                    Total Rounds
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-lg font-semibold"
                    style={{
                      color: "#111827",
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    {rounds.reduce((total, round) => total + round.competencies.length, 0)}
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: "#6B7280",
                      fontSize: "12px",
                    }}
                  >
                    Competencies
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Publishing Info */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "#FEF3C7",
              borderColor: "#FCD34D",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "#F59E0B" }}
              >
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h5
                  className="font-medium mb-1"
                  style={{
                    color: "#92400E",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Publishing this job will:
                </h5>
                <ul className="text-sm space-y-1" style={{ color: "#92400E", fontSize: "13px" }}>
                  <li>• Make the job visible to candidates</li>
                  <li>• Enable application submissions</li>
                  <li>• Activate the hiring pipeline</li>
                  <li>• Send notifications to your team</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{
            borderColor: "#E5E7EB",
            backgroundColor: "#F9FAFB",
          }}
        >
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
            Review Again
          </button>
          <button
            onClick={onConfirm}
            disabled={isPublishing}
            className="px-6 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isPublishing ? "#9CA3AF" : "#10B981",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Publish Job
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
