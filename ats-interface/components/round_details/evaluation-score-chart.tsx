"use client"

import React from "react"
import { clsx } from "clsx"

interface EvaluationScoreChartProps {
  score: number
  size?: "small" | "medium" | "large"
  className?: string
}

export function EvaluationScoreChart({ 
  score, 
  size = "medium", 
  className 
}: EvaluationScoreChartProps) {
  const getSizeConfig = () => {
    switch (size) {
      case "small":
        return {
          containerSize: "w-12 h-12",
          strokeWidth: 3,
          radius: 18,
          textSize: "text-xs",
          fontSize: 10
        }
      case "large":
        return {
          containerSize: "w-24 h-24",
          strokeWidth: 6,
          radius: 42,
          textSize: "text-lg",
          fontSize: 16
        }
      default:
        return {
          containerSize: "w-16 h-16",
          strokeWidth: 4,
          radius: 28,
          textSize: "text-sm",
          fontSize: 12
        }
    }
  }

  const config = getSizeConfig()
  const circumference = 2 * Math.PI * config.radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981" // green-500
    if (score >= 60) return "#f59e0b" // amber-500
    return "#ef4444" // red-500
  }

  const getBackgroundColor = () => "#e5e7eb" // gray-200

  return (
    <div className={clsx("relative flex items-center justify-center", config.containerSize, className)}>
      <svg
        className="transform -rotate-90"
        width="100%"
        height="100%"
        viewBox={`0 0 ${(config.radius + config.strokeWidth) * 2} ${(config.radius + config.strokeWidth) * 2}`}
      >
        {/* Background circle */}
        <circle
          cx={config.radius + config.strokeWidth}
          cy={config.radius + config.strokeWidth}
          r={config.radius}
          stroke={getBackgroundColor()}
          strokeWidth={config.strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={config.radius + config.strokeWidth}
          cy={config.radius + config.strokeWidth}
          r={config.radius}
          stroke={getScoreColor(score)}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            transformOrigin: `${config.radius + config.strokeWidth}px ${config.radius + config.strokeWidth}px`
          }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className={clsx("font-semibold", config.textSize)}
          style={{ 
            color: getScoreColor(score),
            fontSize: size === "small" ? "8px" : undefined
          }}
        >
          {Math.round(score)}%
        </span>
      </div>
    </div>
  )
}