import { ArrowUpDown, ArrowRight } from "lucide-react"
import { RecommendationScore } from "./recommendation-score"
import { StatusTag } from "./status-tag"

interface Candidate {
  id: string
  name: string
  recommendation: {
    type: "highly" | "good" | "needs"
    label: string
    score: number
    maxScore: number
  }
  status: string
  experience: string
}

interface CandidatesTableProps {
  candidates: Candidate[]
}

export function CandidatesTable({ candidates }: CandidatesTableProps) {
  const columns = [
    { key: "name", label: "Applicant's name", sortable: true },
    { key: "recommendation", label: "Recommendation / Score", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "experience", label: "Experience", sortable: false },
  ]

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div className="bg-white rounded-lg border" style={{ borderColor: "#E5E7EB" }}>
      {/* Table Header */}
      <div
        className="grid grid-cols-4 gap-6 px-6 py-4 border-b"
        style={{
          borderColor: "#F3F4F6",
          backgroundColor: "#F9FAFB",
        }}
      >
        {columns.map((column) => (
          <div key={column.key} className="flex items-center gap-2">
            <span
              className="font-medium"
              style={{
                color: "#6B7280",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily,
              }}
            >
              {column.label}
            </span>
            {column.sortable && <ArrowUpDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div>
        {candidates.map((candidate, index) => (
          <div
            key={candidate.id}
            className={`grid grid-cols-4 gap-6 px-6 py-4 hover:bg-gray-50 transition-colors ${
              index !== candidates.length - 1 ? "border-b" : ""
            }`}
            style={{
              borderColor: "#F3F4F6",
            }}
          >
            {/* Name */}
            <div className="flex items-center">
              <span
                className="font-medium"
                style={{
                  color: "#111827",
                  fontSize: "16px",
                  fontWeight: 500,
                  fontFamily,
                }}
              >
                {candidate.name}
              </span>
            </div>

            {/* Recommendation */}
            <div className="flex items-center">
              <RecommendationScore
                type={candidate.recommendation.type}
                label={candidate.recommendation.label}
                score={candidate.recommendation.score}
                maxScore={candidate.recommendation.maxScore}
              />
            </div>

            {/* Status */}
            <div className="flex items-center">
              <StatusTag status={candidate.status} />
            </div>

            {/* Experience */}
            <div className="flex items-center">
              <span
                style={{
                  color: "#6B7280",
                  fontSize: "14px",
                  fontWeight: 400,
                  fontFamily,
                }}
              >
                {candidate.experience}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Section */}
      <div
        className="px-6 py-4 border-t"
        style={{
          borderColor: "#F3F4F6",
          backgroundColor: "#F9FAFB",
        }}
      >
        <button
          className="w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          style={{ color: "#6B7280", fontFamily }}
        >
          <span style={{ fontSize: "14px", fontFamily }}>See 358 other applications with lower ranking</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
