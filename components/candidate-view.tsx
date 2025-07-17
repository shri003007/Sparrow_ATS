import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Users,
  MessageCircle,
  Bookmark,
  Clock,
  Star,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  X,
  Download,

  Loader2
} from "lucide-react"

// Types
interface OverallData {
  name: string;
  email: string;
  phone: string;
  resume_url: string;
  score: number;
  recommendation_category: string;
}

interface IndividualData {
  professional_overview: string;
  key_qualifications: string;
  career_progression: string;
  justification: string;
}

interface Candidate {
  overall_data: OverallData;
  individual_data: IndividualData;
}

interface CandidateViewProps {
  jobRole: string
  candidates: Candidate[]
  filteredCandidates: Candidate[]
  loading: boolean
  error: string | null
  searchQuery: string
  showMoreApplicants: boolean
  onSearchChange: (query: string) => void
  onCandidateClick: (candidate: Candidate) => void
  onShowMoreClick: () => void
  getRecommendationDisplay: (candidate: Candidate) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    text: string;
  }
}

export function CandidateView({
  jobRole,
  candidates,
  filteredCandidates,
  loading,
  error,
  searchQuery,
  showMoreApplicants,
  onSearchChange,
  onCandidateClick,
  onShowMoreClick,
  getRecommendationDisplay
}: CandidateViewProps) {
  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">All roles</div>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <div className="text-sm text-gray-900 font-medium">{jobRole}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{filteredCandidates?.length || 0} candidates found</span>

              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Search to see candidates</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search candidates by name or email"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">All applicants</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">Contacted</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Bookmark className="w-4 h-4" />
              <span className="text-sm">Park for later</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Action pending</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading candidates...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : !filteredCandidates || filteredCandidates.length === 0 ? (

            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No candidates found</p>
              </div>
            </div>
          ) : (
            <>
              {/* Table */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      APPLICANT'S NAME
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RECOMMENDATION / SCORE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EMAIL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PHONE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RESUME
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showMoreApplicants ? filteredCandidates : filteredCandidates?.slice(0, 8) || []).map((candidate, index) => {

                    const recommendation = getRecommendationDisplay(candidate);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            onClick={() => onCandidateClick(candidate)}
                          >
                            {candidate.overall_data.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {recommendation.icon}
                            <span className={`text-sm font-medium ${recommendation.color}`}>{recommendation.text}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {candidate.overall_data.resume_url ? (
                            <button
                              onClick={() => window.open(candidate.overall_data.resume_url, '_blank')}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span className="text-sm">Download Resume</span>

                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">No resume</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Show More Button */}
              {filteredCandidates && filteredCandidates.length > 8 && (

                <div className="p-6 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    onClick={onShowMoreClick}
                  >
                    {showMoreApplicants ? (
                      <>
                        Show fewer applicants
                        <ArrowRight className="w-4 h-4 rotate-180 transition-transform ml-2" />
                      </>
                    ) : (
                      <>
                        See {filteredCandidates.length - 8} more applicants
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 