"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { EvaluationScoreChart } from "./evaluation-score-chart"
import { clsx } from "clsx"

interface CompetencyScoreCardProps {
  name: string
  score: number
  className?: string
}

export function CompetencyScoreCard({ 
  name, 
  score, 
  className 
}: CompetencyScoreCardProps) {
  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-600" }
    if (score >= 60) return { label: "Good", color: "text-yellow-600" }
    return { label: "Needs Work", color: "text-red-600" }
  }

  const scoreLabel = getScoreLabel(score)

  return (
    <Card className={clsx("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <EvaluationScoreChart score={score} size="small" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate" title={name}>
              {name}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={clsx("text-xs font-medium", scoreLabel.color)}>
                {scoreLabel.label}
              </span>
              <span className="text-xs text-gray-500">
                {Math.round(score)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}