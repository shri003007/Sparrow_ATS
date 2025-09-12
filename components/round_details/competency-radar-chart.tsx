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

  // State for hover interaction
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null)

  // Generate dynamic colors for each candidate
  const colors = [
    "#6366F1", // indigo-500
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#8B5CF6", // violet-500
    "#06B6D4", // cyan-500
    "#F97316", // orange-500
    "#84CC16", // lime-500
    "#EC4899", // pink-500
    "#6B7280"  // gray-500
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
        <p className="text-sm text-gray-600" style={{ fontFamily }}>
          Comparing {selectedCandidates.length} candidate{selectedCandidates.length > 1 ? 's' : ''} across all competencies
        </p>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[400px] w-full p-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="competency"
              tick={{
                fontSize: 11,
                fill: 'hsl(var(--muted-foreground))',
                fontFamily,
                dy: -12,
                dx: 0
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
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg" style={{ fontFamily }}>
                      <p className="font-medium mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-sm">
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
            <ChartLegend
              wrapperStyle={{ fontFamily, fontSize: '12px' }}
              iconType="rect"
              onMouseEnter={(payload, index) => {
                if (payload && payload.dataKey) {
                  setHoveredCandidate(String(payload.dataKey))
                }
              }}
              onMouseLeave={() => {
                setHoveredCandidate(null)
              }}
            />
            {selectedCandidates.map((candidateId, index) => {
              const candidateName = evaluatedCandidates.find(c => c.id === candidateId)?.name || `Candidate ${index + 1}`
              const color = colors[index % colors.length]

              // Hide radar if another candidate is being hovered
              const isVisible = !hoveredCandidate || hoveredCandidate === candidateName
              const opacity = isVisible ? 1 : 0.1

              return (
                <Radar
                  key={candidateId}
                  name={candidateName}
                  dataKey={candidateName}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.1 * opacity}
                  strokeWidth={isVisible ? 3 : 1}
                  strokeOpacity={opacity}
                  dot={{ fill: color, strokeWidth: 2, r: isVisible ? 6 : 2, fillOpacity: opacity }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              )
            })}
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>

    </div>
  )
}
