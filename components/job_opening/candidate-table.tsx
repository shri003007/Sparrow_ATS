import { ArrowUpDown, ArrowRight } from "lucide-react"
import { RecommendationBadge } from "./recommendation-badge"
import { StatusDropdown } from "./status-dropdown"
import { Button } from "@/components/ui/button"
import type { Candidate } from "@/lib/types"

interface CandidateTableProps {
  candidates: Candidate[]
}

export function CandidateTable({ candidates }: CandidateTableProps) {
  const columns = [
    { key: "name", label: "Applicant's name", sortable: true },
    { key: "recommendation", label: "Recommendation / Score", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "experience", label: "Experience", sortable: false },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
        {columns.map((column) => (
          <div key={column.key} className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{column.label}</span>
            {column.sortable && <ArrowUpDown className="w-4 h-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center">
              <span className="font-medium text-gray-900">{candidate.name}</span>
            </div>

            <div className="flex items-center">
              <RecommendationBadge
                type={candidate.recommendation.type}
                label={candidate.recommendation.label}
                score={candidate.recommendation.score}
                maxScore={candidate.recommendation.maxScore}
              />
            </div>

            <div className="flex items-center">
              <StatusDropdown status={candidate.status} />
            </div>

            <div className="flex items-center">
              <span className="text-sm text-gray-600">{candidate.experience}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <Button variant="ghost" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900">
          <span>See 358 other applications with lower ranking</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
