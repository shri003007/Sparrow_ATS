import React, { useState } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import { CheckCircle, Target, MessageSquare, TrendingUp, Award, Users } from 'lucide-react';

interface EvaluationSection {
  title: string;
  content: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface ParsedEvaluation {
  sections: EvaluationSection[];
  metrics: {
    accuracy?: string;
    score?: string;
    recommendation?: string;
  };
}

// New interfaces for the updated API response
interface CompetencyQuestion {
  question_id: string;
  question: string;
  score: number; // 0 or 1
  explanation: string;
}

interface CompetencyScore {
  competency_name: string;
  questions: CompetencyQuestion[];
  percentage_score: number;
}

interface CompetencyEvaluation {
  competency_scores: CompetencyScore[];
  overall_percentage_score: number;
}

interface EvaluationResult {
  evaluation_summary: string;
  competency_evaluation?: CompetencyEvaluation;
  interviewer_evaluation_summary?: string;
  overall_percentage_score?: number;
  round_type?: string;
  success: boolean;
  error_message?: string;
}

export function parseEvaluationContent(content: string): ParsedEvaluation {
  // Clean the content
  const cleanContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  const sections: EvaluationSection[] = [];
  const metrics: { accuracy?: string; score?: string; recommendation?: string } = {};

  // Define section patterns and their styling
  const sectionPatterns = [
    {
      pattern: /## Overall Performance Summary\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Overall Performance Summary',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      pattern: /## Key Strengths\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Key Strengths',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      pattern: /## Areas for Improvement\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Areas for Improvement',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      pattern: /## Technical Assessment\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Technical Assessment',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      pattern: /## Job Fit Analysis\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Job Fit Analysis',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      pattern: /## Recommendations\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Recommendations',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      pattern: /## Hiring Recommendation\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Hiring Recommendation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      pattern: /## Overall Interview Performance\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Overall Interview Performance',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      pattern: /## Communication & Soft Skills\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Communication & Soft Skills',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      pattern: /## Cultural Fit & Team Dynamics\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Cultural Fit & Team Dynamics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    },
    {
      pattern: /## Experience & Background Relevance\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Experience & Background Relevance',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      pattern: /## Areas of Concern\s*\n\n([\s\S]*?)(?=\n##|$)/,
      title: 'Areas of Concern',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  // Extract sections
  sectionPatterns.forEach(({ pattern, title, icon, color, bgColor }) => {
    const match = cleanContent.match(pattern);
    if (match && match[1].trim()) {
      sections.push({
        title,
        content: match[1].trim(),
        icon,
        color,
        bgColor
      });
    }
  });

  // Extract metrics
  const accuracyMatch = cleanContent.match(/- \*\*Accuracy\*\*: (\d+\/\d+)/);
  if (accuracyMatch) {
    metrics.accuracy = accuracyMatch[1];
  }

  const scoreMatch = cleanContent.match(/(\d+\.?\d*)\s*\/\s*5/);
  if (scoreMatch) {
    metrics.score = scoreMatch[1];
  }

  const recommendationMatch = cleanContent.match(/- \*\*Recommendation\*\*: ([^•\n]+)/);
  if (recommendationMatch) {
    metrics.recommendation = recommendationMatch[1].trim();
  }

  return { sections, metrics };
}

interface EvaluationRendererProps {
  content: string;
  showMetrics?: boolean;
}

// New interface for enhanced evaluation renderer
interface EnhancedEvaluationRendererProps {
  evaluationResult: EvaluationResult;
  showMetrics?: boolean;
}

// Component to display competency evaluation with rubric scores
export function CompetencyEvaluationRenderer({ competencyEvaluation }: { competencyEvaluation: CompetencyEvaluation }) {
  const [expandedCompetencies, setExpandedCompetencies] = useState<{ [key: string]: boolean }>({});

  const toggleCompetency = (competencyName: string) => {
    setExpandedCompetencies(prev => ({
      ...prev,
      [competencyName]: !prev[competencyName]
    }));
  };

  // Safe access to overall percentage score
  const overallScore = competencyEvaluation?.overall_percentage_score ?? 0;

  return (
    <div className="space-y-4">
      {/* Section Scores - Improved UI */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Section Scores</h4>
        
        {competencyEvaluation?.competency_scores?.map((competency, index) => {
          // Safe access to competency percentage score
          const competencyScore = competency?.percentage_score ?? 0;
          
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* Competency Header - Clickable */}
              <button
                onClick={() => toggleCompetency(competency.competency_name)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
              >
                {/* Left side - Competency name */}
                <div className="flex items-center gap-3 flex-1">
                  <h5 className="text-sm font-medium text-gray-900 text-left">
                    {competency.competency_name || 'Unknown Competency'}
                  </h5>
                </div>
                
                {/* Right side - Score, progress bar, and chevron */}
                <div className="flex items-center gap-4">
                  {/* Score */}
                  <div className="text-right min-w-[80px]">
                    <div className="text-sm font-semibold text-gray-900">
                      {competencyScore.toFixed(2)}/100
                    </div>
                  </div>
                  
                  {/* Progress Bar - Wider and more prominent */}
                  <div className="w-32 bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        competencyScore >= 80 
                          ? 'bg-green-500' 
                          : competencyScore >= 60 
                          ? 'bg-orange-400' 
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(competencyScore, 100)}%` }}
                    ></div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      expandedCompetencies[competency.competency_name] ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expandable Questions Details */}
              {expandedCompetencies[competency.competency_name] && competency.questions && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-3">
                    {competency.questions.map((question, qIndex) => (
                      <div key={qIndex} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          question.score === 1 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {question.score === 1 ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">×</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {question.question || 'No question text available'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {question.explanation || 'No explanation available'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }) || []}
      </div>
    </div>
  );
}

// Component to display interviewer evaluation
export function InterviewerEvaluationRenderer({ interviewerEvaluation }: { interviewerEvaluation: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <h4 className="text-lg font-semibold text-purple-600">
          Interview Report
        </h4>
      </div>
      
      {/* Full Interview Report - Always Visible */}
      <div className="text-sm text-gray-700">
        <MarkdownRenderer content={interviewerEvaluation} />
      </div>
    </div>
  );
}

// Enhanced evaluation renderer that handles both old and new API response formats
export function EnhancedEvaluationRenderer({ evaluationResult, showMetrics = true }: EnhancedEvaluationRendererProps) {
  const isInterviewRound = evaluationResult.round_type === 'INTERVIEW' || evaluationResult.competency_evaluation;

  return (
    <div className="space-y-6">
      {/* 1. Competency Evaluation FIRST (for INTERVIEW rounds) */}
      {isInterviewRound && evaluationResult.competency_evaluation && 
       evaluationResult.competency_evaluation.overall_percentage_score !== undefined && (
        <CompetencyEvaluationRenderer competencyEvaluation={evaluationResult.competency_evaluation} />
      )}

      {/* 2. Main Evaluation Summary SECOND */}
      {evaluationResult.evaluation_summary && (
        <EvaluationSummaryRenderer content={evaluationResult.evaluation_summary} overallScore={evaluationResult.overall_percentage_score} />
      )}

      {/* 3. Interviewer Evaluation LAST (for INTERVIEW rounds) */}
      {isInterviewRound && evaluationResult.interviewer_evaluation_summary && (
        <InterviewerEvaluationRenderer interviewerEvaluation={evaluationResult.interviewer_evaluation_summary} />
      )}
    </div>
  );
}

// Component to display evaluation summary with expandable detailed results
export function EvaluationSummaryRenderer({ content, overallScore }: { content: string, overallScore?: number }) {
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  
  // Extract the "Overall Evaluation" section specifically
  const getOverallEvaluation = (content: string) => {
    // Look for "## Overall Evaluation" section
    const overallEvalMatch = content.match(/## Overall Evaluation\s*\n\n([\s\S]*?)(?=\n##|$)/);
    if (overallEvalMatch) {
      return overallEvalMatch[1].trim();
    }
    
    // Fallback: Look for the last section that might be the overall evaluation
    const sections = content.split(/^##\s/m);
    if (sections.length > 1) {
      // The last section is usually the overall evaluation
      const lastSection = sections[sections.length - 1];
      // Check if it contains typical overall evaluation keywords
      if (lastSection.includes('Performance Summary') || 
          lastSection.includes('Key Strengths') || 
          lastSection.includes('Hiring Recommendation') ||
          lastSection.includes('Overall')) {
        return lastSection.replace(/^[^\n]*\n/, '').trim(); // Remove the heading line
      }
    }
    
    // Final fallback: return content before first ## heading
    return content.split(/^##\s/m)[0].trim();
  };

  // Extract detailed sections (all ## sections except the Overall Evaluation)
  const getDetailedSections = (content: string) => {
    const sections = [];
    const parts = content.split(/^##\s/m);
    
    for (let i = 1; i < parts.length; i++) {
      const sectionContent = parts[i];
      const lines = sectionContent.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      
      // Skip the "Overall Evaluation" section from detailed sections
      if (title && body && !title.toLowerCase().includes('overall evaluation')) {
        sections.push({ title, body });
      }
    }
    return sections;
  };

  const overallEvaluation = getOverallEvaluation(content);
  const detailedSections = getDetailedSections(content);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Overall Evaluation Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold text-blue-600">
            Overall Evaluation
          </h4>
        </div>
        
        {/* Overall Score Badge */}
        {overallScore !== undefined && overallScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Score:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              overallScore >= 80 
                ? 'bg-green-100 text-green-800' 
                : overallScore >= 60 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {overallScore.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
      
      {/* Overall Evaluation Content - Always Visible */}
      <div className="text-sm text-gray-700 mb-4">
        <MarkdownRenderer content={overallEvaluation} />
      </div>

      {/* Detailed Report Dropdown */}
      {detailedSections.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setShowDetailedReport(!showDetailedReport)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <span>{showDetailedReport ? 'Hide' : 'Show'} Detailed Report ({detailedSections.length} sections)</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${
                showDetailedReport ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Expandable Detailed Report Sections */}
          {showDetailedReport && (
            <div className="space-y-4">
              {detailedSections.map((section, index) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <h5 className="text-sm font-semibold text-gray-900">
                      {section.title}
                    </h5>
                  </div>
                  
                  <div className="text-sm text-gray-700 ml-7">
                    <MarkdownRenderer content={section.body} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EvaluationRenderer({ content, showMetrics = true }: EvaluationRendererProps) {
  const { sections, metrics } = parseEvaluationContent(content);

  // If no structured sections found, render as plain markdown
  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <MarkdownRenderer content={content} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {showMetrics && (metrics.accuracy || metrics.score || metrics.recommendation) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {metrics.accuracy && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metrics.accuracy}
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          )}
          {metrics.score && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metrics.score}<span className="text-lg text-gray-500">/5</span>
              </div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
          )}
          {metrics.recommendation && (
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1 capitalize">
                {metrics.recommendation.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-gray-600">Recommendation</div>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-6 h-6 ${section.bgColor} rounded-full flex items-center justify-center`}>
              <div className={section.color}>
                {section.icon}
              </div>
            </div>
            <h3 className={`text-lg font-semibold ${section.color}`}>
              {section.title}
            </h3>
          </div>
          <div className="text-sm text-gray-700">
            <MarkdownRenderer content={section.content} />
          </div>
        </div>
      ))}
    </div>
  );
} 

// Export types for use in other components
export type { 
  CompetencyQuestion, 
  CompetencyScore, 
  CompetencyEvaluation, 
  EvaluationResult,
  EnhancedEvaluationRendererProps
}; 