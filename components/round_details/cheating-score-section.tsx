"use client"

import React from 'react'
import { Shield, AlertTriangle, Eye, Clock, RotateCcw, FileText } from 'lucide-react'
import { EvaluationScoreChart } from './evaluation-score-chart'

interface CheatingScoreData {
  cheating_score: number
  risk_level: string
  delayed_response_count: number
  question_repetition_count: number
  visual_score: number
  suspicious_indicators: string[]
  image_analysis_summary: string
}

interface CheatingScoreSectionProps {
  cheatingScore: CheatingScoreData
}

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel.toUpperCase()) {
    case 'LOW':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        badge: 'bg-green-100 text-green-800'
      }
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        badge: 'bg-yellow-100 text-yellow-800'
      }
    case 'HIGH':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badge: 'bg-red-100 text-red-800'
      }
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        badge: 'bg-gray-100 text-gray-800'
      }
  }
}

const getScoreColor = (score: number) => {
  if (score <= 30) return '#10B981' // Green
  if (score <= 70) return '#F59E0B' // Yellow
  return '#EF4444' // Red
}

const getScoreTextColor = (score: number) => {
  if (score <= 30) return 'text-green-600'
  if (score <= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export function CheatingScoreSection({ cheatingScore }: CheatingScoreSectionProps) {
  const riskColors = getRiskLevelColor(cheatingScore.risk_level)

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Integrity Analysis</h3>
          </div>
        </div>
        
        <div className="p-6">
          {/* Cheating Score and Metrics Layout */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Left Side - Circular Cheating Score */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <EvaluationScoreChart 
                      score={cheatingScore.cheating_score} 
                      size="large"
                    />
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Cheating Score</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColors.badge}`}>
                  {cheatingScore.risk_level} RISK
                </span>
              </div>
            </div>

            {/* Right Side - Metrics Vertically Stacked */}
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Delayed Responses</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{cheatingScore.delayed_response_count}</div>
                <div className="text-xs text-gray-500">instances detected</div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Question Repetitions</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{cheatingScore.question_repetition_count}</div>
                <div className="text-xs text-gray-500">repetitions found</div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Visual Score</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{cheatingScore.visual_score}%</div>
                <div className="text-xs text-gray-500">visual analysis</div>
              </div>
            </div>
          </div>

          {/* Suspicious Indicators */}
          {cheatingScore.suspicious_indicators && cheatingScore.suspicious_indicators.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
                Suspicious Indicators
              </h4>
              <div className="space-y-2">
                {cheatingScore.suspicious_indicators.map((indicator, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{indicator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Analysis Summary */}
          {cheatingScore.image_analysis_summary && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                Visual Analysis Summary
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {cheatingScore.image_analysis_summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
