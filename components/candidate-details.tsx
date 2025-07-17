import React from "react"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  X,

  Download,

  Clock,
  Bookmark
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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

interface CandidateDetailsProps {
  selectedCandidate: Candidate | null
  jobRole: string
  candidateDetailTab: string
  onClose: () => void
  onTabChange: (tab: string) => void
  getRecommendationDisplay: (candidate: Candidate) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    text: string;
  }
}

export function CandidateDetails({
  selectedCandidate,
  jobRole,
  candidateDetailTab,
  onClose,
  onTabChange,
  getRecommendationDisplay
}: CandidateDetailsProps) {
  if (!selectedCandidate) return null;

  const recommendation = getRecommendationDisplay(selectedCandidate);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div className="fixed top-4 right-4 bottom-4 w-2/3 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">All roles</div>
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-90" />
            <div className="text-sm text-gray-900 font-medium">{jobRole}</div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Candidate Info Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">{selectedCandidate.overall_data.name}</h2>
              {selectedCandidate.overall_data.resume_url && (
                <button
                  onClick={() => {
                    window.open(selectedCandidate.overall_data.resume_url, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Download Resume"
                >
                  <Download className="w-5 h-5" />

                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Contact
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl">
                  <DropdownMenuItem className="rounded-lg">
                    <a href={`mailto:${selectedCandidate.overall_data.email}`}>Send Email</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <a href={`tel:${selectedCandidate.overall_data.phone}`}>Call</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">Send Message</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                    <Clock className="w-4 h-4 mr-1" />
                    Action pending
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl">
                  <DropdownMenuItem className="rounded-lg text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg text-orange-500">
                    <Bookmark className="w-4 h-4 mr-2" />
                    Park for later
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div>{selectedCandidate.overall_data.email}</div>
            <div>{selectedCandidate.overall_data.phone}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => onTabChange("overview")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              candidateDetailTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Professional Overview
          </button>
          <button
            onClick={() => onTabChange("assessment")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              candidateDetailTab === "assessment"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Assessment & Score
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {candidateDetailTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Overview</h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedCandidate.individual_data.professional_overview}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Qualifications</h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedCandidate.individual_data.key_qualifications}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Career Progression</h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedCandidate.individual_data.career_progression}
                </p>
              </div>
            </div>
          )}

          {candidateDetailTab === "assessment" && (
            <div className="space-y-6">
              {/* Score Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {selectedCandidate.overall_data.score}<span className="text-2xl text-gray-500">/5</span>
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>

              {/* Recommendation */}
              <div className={`${recommendation.bgColor} rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={recommendation.color}>{recommendation.icon}</div>
                  <h3 className={`text-lg font-semibold ${recommendation.color}`}>
                    {selectedCandidate.overall_data.recommendation_category}
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {selectedCandidate.individual_data.justification}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 