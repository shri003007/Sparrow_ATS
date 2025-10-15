"use client"

import React, { useState } from "react"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartLegend, ChartConfig } from "@/components/ui/chart"

interface CompetencyData {
  competency: string
  score: number
  candidateName: string
  candidateId?: string
  isGlobalAverage?: boolean
}

interface CompetencyRadarChartProps {
  data: CompetencyData[]
  selectedCandidates: string[]
  competencies: Array<{
    name: string
    description: string
  }>
  evaluatedCandidates: Array<{
    id: string
    name: string
    email: string
  }>
}

const chartConfig: ChartConfig = {
  score: {
    label: "Score",
    color: "#6366F1",
  },
}

export function CompetencyRadarChart({
  data,
  selectedCandidates,
  competencies,
  evaluatedCandidates
}: CompetencyRadarChartProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // State for hover and click interactions
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null)
  const [clickedCandidate, setClickedCandidate] = useState<string | null>(null)
  const [clickedCandidateData, setClickedCandidateData] = useState<{
    name: string
    scores: Array<{ competency: string; score: number }>
    position: { x: number; y: number }
  } | null>(null)
  const [clickedCompetency, setClickedCompetency] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  // Generate dynamic colors for each candidate - 50 completely unique colors
  const colors = [
    // Core Primary & Secondary Colors (8)
    "#FF0000", // Pure Red
    "#00FF00", // Pure Green  
    "#0000FF", // Pure Blue
    "#FFFF00", // Pure Yellow
    "#FF00FF", // Pure Magenta
    "#00FFFF", // Pure Cyan
    "#FFA500", // Orange
    "#800080", // Purple
    
    // Distinct Tertiary Colors (8)
    "#FF69B4", // Hot Pink
    "#32CD32", // Lime Green
    "#FF1493", // Deep Pink
    "#00CED1", // Dark Turquoise
    "#FF4500", // Red Orange
    "#9370DB", // Medium Purple
    "#00FA9A", // Medium Spring Green
    "#DC143C", // Crimson
    
    // Earth & Nature Tones (8)
    "#8B4513", // Saddle Brown
    "#228B22", // Forest Green
    "#B22222", // Fire Brick
    "#DAA520", // Goldenrod
    "#2F4F4F", // Dark Slate Gray
    "#8FBC8F", // Dark Sea Green
    "#CD853F", // Peru
    "#556B2F", // Dark Olive Green
    
    // Jewel Tones (8)
    "#4169E1", // Royal Blue
    "#8A2BE2", // Blue Violet
    "#A0522D", // Sienna
    "#5F9EA0", // Cadet Blue
    "#D2691E", // Chocolate
    "#FF7F50", // Coral
    "#6495ED", // Cornflower Blue
    "#B8860B", // Dark Goldenrod
    
    // Unique Mixed Colors (8)
    "#483D8B", // Dark Slate Blue
    "#2E8B57", // Sea Green
    "#800000", // Maroon
    "#008B8B", // Dark Cyan
    "#9932CC", // Dark Orchid
    "#E9967A", // Dark Salmon
    "#8FBC8F", // Dark Sea Green
    "#FF6347", // Tomato
    
    // Special Colors (10)  
    "#1E90FF", // Dodger Blue
    "#FF8C00", // Dark Orange
    "#9ACD32", // Yellow Green
    "#EE82EE", // Violet
    "#90EE90", // Light Green
    "#F0E68C", // Khaki
    "#DDA0DD", // Plum
    "#87CEEB", // Sky Blue
    "#F4A460", // Sandy Brown
    "#20B2AA"  // Light Sea Green
]

  // Transform data for radar chart - competencies as axes, each candidate as a series
  const chartData = competencies.map(comp => {
    const competencyData: any = { competency: comp.name }

    selectedCandidates.forEach((candidateId, index) => {
      const candidateData = data.find(item =>
        item.competency === comp.name && item.candidateId === candidateId
      )
      const candidateName = evaluatedCandidates.find(c => c.id === candidateId)?.name || `Candidate ${index + 1}`
      competencyData[candidateName] = candidateData?.score || 0
    })

    return competencyData
  })

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-gray-500" style={{ fontFamily }}>
            No competency data available for selected candidates
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
          Candidate Performance Comparison
        </h3>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[550px] w-full p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            margin={{ top: 90, right: 90, bottom: 90, left: 90 }}
            onClick={(event: any) => {
              // Clear selection when clicking on chart background (not on lines, dots, or text)
              if (event && event.target && 
                  event.target.tagName !== 'path' && 
                  event.target.tagName !== 'circle' && 
                  event.target.tagName !== 'text') {
                setClickedCandidate(null)
                setClickedCandidateData(null)
                setClickedCompetency(null)
                setShowTooltip(false)
              }
            }}
            onMouseLeave={() => {
              // Clear hover when mouse leaves the entire chart area
              setHoveredCandidate(null)
            }}
          >
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="competency"
              tick={(props: any) => {
                const { x, y, payload, index } = props
                const competencyName = payload.value
                const isClicked = clickedCompetency === competencyName
                
                // Calculate angle for this competency (assuming equal distribution)
                const totalCompetencies = competencies.length
                const angle = (index * 360) / totalCompetencies - 90 // -90 to start from top
                const radians = (angle * Math.PI) / 180
                
                // Calculate text positioning based on angle
                const radius = 55 // Distance from center for text positioning
                const textX = x + Math.cos(radians) * radius
                const textY = y + Math.sin(radians) * radius
                
                // Determine text anchor based on angle
                let textAnchor: "start" | "middle" | "end" = 'middle'
                
                // More precise angle-based text anchoring
                if (angle > 45 && angle < 135) {
                  textAnchor = 'start' // Top-right quadrant
                } else if (angle >= 135 && angle <= 225) {
                  textAnchor = 'end' // Left side (including bottom-left)
                } else if (angle > 225 && angle < 315) {
                  textAnchor = 'start' // Bottom-left to bottom-right
                } else {
                  textAnchor = 'middle' // Top and variations
                }
                
                // Special handling for exact positions
                if (angle >= 160 && angle <= 200) {
                  textAnchor = 'end' // Pure left side
                } else if (angle >= -20 && angle <= 20) {
                  textAnchor = 'start' // Pure right side
                } else if (angle >= 80 && angle <= 100) {
                  textAnchor = 'middle' // Pure bottom - center align like top
                }
                
                // Helper function to wrap text
                const wrapText = (text: string, maxLength: number = 18) => {
                  if (text.length <= maxLength) return [text]
                  
                  const words = text.split(' ')
                  const lines = []
                  let currentLine = ''
                  
                  for (const word of words) {
                    if ((currentLine + word).length <= maxLength) {
                      currentLine += (currentLine ? ' ' : '') + word
                    } else {
                      if (currentLine) lines.push(currentLine)
                      currentLine = word
                    }
                  }
                  if (currentLine) lines.push(currentLine)
                  
                  return lines.slice(0, 2) // Max 2 lines
                }
                
                const textLines = wrapText(competencyName)
                const lineHeight = 12
                
                // Adjust Y position based on number of lines and angle
                let startY = textY
                if (textLines.length > 1) {
                  // For multi-line text, center it vertically
                  startY = textY - (lineHeight * (textLines.length - 1)) / 2
                }
                
                return (
                  <g>
                    {textLines.map((line, lineIndex) => (
                      <text
                        key={`${competencyName}-line-${lineIndex}`}
                        x={textX}
                        y={startY + (lineIndex * lineHeight)}
                        textAnchor={textAnchor}
                        fontSize={10}
                        fill={isClicked ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                        fontFamily={fontFamily}
                        style={{ 
                          cursor: 'pointer',
                          fontWeight: isClicked ? 'bold' : 'normal'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (clickedCompetency === competencyName) {
                            // If already clicked, hide tooltip
                            setClickedCompetency(null)
                            setShowTooltip(false)
                          } else {
                            // Show tooltip for this competency
                            setClickedCompetency(competencyName)
                            setShowTooltip(true)
                          }
                        }}
                        className="hover:fill-primary transition-colors duration-200"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                )
              }}
              className="text-xs"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily }}
              tickCount={6}
              orientation="middle"
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                // Only show tooltip when explicitly requested (clicked competency)
                if (showTooltip && clickedCompetency === label && active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg" style={{ fontFamily }}>
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={`${entry.name}-${index}`} className="text-sm">
                          <span style={{ color: entry.color }}>{entry.name}</span>:{" "}
                          <span className="font-semibold">{entry.value}%</span>
                        </p>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            {selectedCandidates.map((candidateId, index) => {
              const candidateName = evaluatedCandidates.find(c => c.id === candidateId)?.name || `Candidate ${index + 1}`
              const color = colors[index % colors.length]

              // Enhanced visibility logic for hover and click
              const isHovered = hoveredCandidate === candidateName
              const isClicked = clickedCandidate === candidateName
              const isHighlighted = isHovered || isClicked
              const isVisible = !hoveredCandidate || isHovered || isClicked
              const opacity = isVisible ? 1 : 0.1

              // Enhanced styling for clicked and hovered candidates
              const strokeWidth = isClicked ? 4 : (isHovered ? 3.5 : (isVisible ? 3 : 1))
              const dotRadius = isClicked ? 8 : (isHovered ? 7 : (isVisible ? 6 : 2))
              
              // Helper function to handle candidate selection
              const handleCandidateSelect = (event: React.MouseEvent) => {
                event.stopPropagation()
                
                const candidateScores = competencies.map(comp => {
                  const competencyData = data.find(item =>
                    item.competency === comp.name && item.candidateId === candidateId
                  )
                  return {
                    competency: comp.name,
                    score: competencyData?.score || 0
                  }
                })

                setClickedCandidate(candidateName)
                setClickedCandidateData({
                  name: candidateName,
                  scores: candidateScores,
                  position: { x: event.clientX, y: event.clientY }
                })
              }

              return (
                <Radar
                  key={candidateId}
                  name={candidateName}
                  dataKey={candidateName}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.1 * opacity}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredCandidate(candidateName)}
                  onMouseLeave={() => setHoveredCandidate(null)}
                  onClick={handleCandidateSelect}
                  dot={(props: any) => {
                    // Custom dot component with click handler
                    const { cx, cy, payload } = props
                    const dotKey = `${candidateId}-${payload?.competency || Math.random()}`
                    
                    return (
                      <g key={dotKey}>
                        {/* Main dot */}
                        <circle
                          key={`${dotKey}-main`}
                          cx={cx}
                          cy={cy}
                          r={dotRadius}
                          fill={color}
                          stroke={color}
                          strokeWidth={isClicked ? 3 : 2}
                          fillOpacity={opacity}
                          style={{ cursor: 'pointer' }}
                          onClick={handleCandidateSelect}
                          className="transition-all duration-200"
                        />
                        {/* Invisible larger clickable area */}
                        <circle
                          key={`${dotKey}-clickable`}
                          cx={cx}
                          cy={cy}
                          r={dotRadius + 4}
                          fill="transparent"
                          stroke="transparent"
                          style={{ cursor: 'pointer' }}
                          onClick={handleCandidateSelect}
                          className="hover:fill-gray-200 hover:fill-opacity-20 transition-all duration-200"
                        />
                      </g>
                    )
                  }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              )
            })}
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Custom Legend with Proper Wrapping */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          Candidates ({selectedCandidates.length})
        </h4>
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
          {selectedCandidates.map((candidateId, index) => {
            const candidateName = evaluatedCandidates.find(c => c.id === candidateId)?.name || `Candidate ${index + 1}`
            const color = colors[index % colors.length]
            const isHovered = hoveredCandidate === candidateName
            const isClicked = clickedCandidate === candidateName
            
            return (
              <div
                key={candidateId}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200 ${
                  isClicked ? 'bg-blue-100 scale-110 ring-2 ring-blue-300' : 
                  isHovered ? 'bg-gray-100 scale-105' : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredCandidate(candidateName)}
                onMouseLeave={() => setHoveredCandidate(null)}
                onClick={(event) => {
                  // Handle legend click
                  const candidateScores = competencies.map(comp => {
                    const competencyData = data.find(item =>
                      item.competency === comp.name && item.candidateId === candidateId
                    )
                    return {
                      competency: comp.name,
                      score: competencyData?.score || 0
                    }
                  })

                  if (clickedCandidate === candidateName) {
                    // If already clicked, unclick
                    setClickedCandidate(null)
                    setClickedCandidateData(null)
                  } else {
                    // Calculate position near the radar chart for this candidate
                    // Get the chart container element to calculate position
                    const chartContainer = document.querySelector('[data-chart="radar"]') || document.querySelector('.recharts-wrapper')
                    let chartX = window.innerWidth / 2 // Default center
                    let chartY = window.innerHeight / 2
                    
                    if (chartContainer) {
                      const rect = chartContainer.getBoundingClientRect()
                      chartX = rect.left + rect.width / 2
                      chartY = rect.top + rect.height / 2
                      
                      // Find the candidate's highest scoring competency to position tooltip near it
                      const highestScore = Math.max(...candidateScores.map(s => s.score))
                      const highestCompetency = candidateScores.find(s => s.score === highestScore)
                      
                      if (highestCompetency) {
                        // Find the index of this competency to calculate angle
                        const competencyIndex = competencies.findIndex(c => c.name === highestCompetency.competency)
                        if (competencyIndex !== -1) {
                          // Calculate angle for this competency
                          const angle = (competencyIndex * 360) / competencies.length - 90 // -90 to start from top
                          const radians = (angle * Math.PI) / 180
                          
                          // Position tooltip towards the highest scoring competency
                          const radius = 60 // Distance from center towards the competency
                          chartX += Math.cos(radians) * radius
                          chartY += Math.sin(radians) * radius
                        }
                      }
                    }

                    // Click new candidate - position tooltip near their strongest area on chart
                    setClickedCandidate(candidateName)
                    setClickedCandidateData({
                      name: candidateName,
                      scores: candidateScores,
                      position: { x: chartX, y: chartY }
                    })
                  }
                }}
                style={{ fontFamily }}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${isClicked ? 'ring-1 ring-white' : ''}`}
                  style={{ backgroundColor: color }}
                />
                <span
                  className={`text-xs whitespace-nowrap ${
                    isClicked ? 'font-bold text-blue-900' :
                    isHovered ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                  style={{ fontFamily }}
                >
                  {candidateName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Tooltip for Clicked Candidate */}
      {clickedCandidateData && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => {
            setClickedCandidate(null)
            setClickedCandidateData(null)
            setClickedCompetency(null)
            setShowTooltip(false)
          }}
        >
          <div 
            className="absolute bg-white rounded-lg shadow-xl border p-4 max-w-sm pointer-events-auto relative"
            style={{
              left: `${Math.min(Math.max(clickedCandidateData.position.x - 150, 20), window.innerWidth - 320)}px`,
              top: `${Math.min(Math.max(clickedCandidateData.position.y - 100, 20), window.innerHeight - 300)}px`,
              fontFamily
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointing to the clicked element */}
            <div 
              className="absolute w-3 h-3 bg-white border-l border-b transform rotate-45 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: '20px',
                top: '20px',
                boxShadow: '-2px 2px 2px rgba(0,0,0,0.1)'
              }}
            />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {clickedCandidateData.name}
              </h3>
              <button
                onClick={() => {
                  setClickedCandidate(null)
                  setClickedCandidateData(null)
                  setClickedCompetency(null)
                  setShowTooltip(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Competency Scores
              </h4>
              {clickedCandidateData.scores.map((score, index) => (
                <div key={`${score.competency}-${index}`} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex-1 pr-2">
                    {score.competency}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${score.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {score.score}%
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="pt-2 mt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Average Score
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {Math.round(clickedCandidateData.scores.reduce((sum, s) => sum + s.score, 0) / clickedCandidateData.scores.length)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}