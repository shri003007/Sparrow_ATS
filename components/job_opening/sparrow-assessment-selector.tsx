"use client"

import React, { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Check } from "lucide-react"
import { SparrowAssessmentModal } from "./sparrow-assessment-modal"

interface SparrowAssessmentSelectorProps {
  isEnabled: boolean
  selectedAssessmentId?: string
  selectedTestName?: string
  selectedAssessmentName?: string
  selectedFilterColumn?: string
  onToggle: (enabled: boolean) => void
  onAssessmentSelect: (assessmentId: string | undefined, testName?: string, assessmentName?: string) => void
  onFilterColumnSelect: (filterColumn: string | undefined) => void
}

export function SparrowAssessmentSelector({
  isEnabled,
  selectedAssessmentId,
  selectedTestName,
  selectedAssessmentName,
  selectedFilterColumn,
  onToggle,
  onAssessmentSelect,
  onFilterColumnSelect
}: SparrowAssessmentSelectorProps) {
  const [showModal, setShowModal] = useState(false)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const handleToggle = (enabled: boolean) => {
    onToggle(enabled)
    if (!enabled) {
      // Reset selections when disabled
      onAssessmentSelect(undefined)
    }
  }

  const handleAssessmentSelect = (assessmentId: string, testName: string, assessmentName: string) => {
    onAssessmentSelect(assessmentId, testName, assessmentName)
    setShowModal(false)
  }

  const handleConfigure = () => {
    setShowModal(true)
  }

  const handleRemoveAssessment = () => {
    onAssessmentSelect(undefined)
  }

  return (
    <div className="space-y-4" style={{ fontFamily }}>
      {/* Toggle Switch */}
      <div className="flex items-center space-x-3">
        <Switch
          id="sparrow-assessment-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
        />
        <Label 
          htmlFor="sparrow-assessment-toggle"
          className="text-sm font-medium"
          style={{ color: "#374151" }}
        >
          Conduct this round in Sparrow Interviews
        </Label>
      </div>

      {/* Assessment Configuration */}
      {isEnabled && (
        <div className="space-y-4 pl-6 border-l-2 border-blue-200">
          {/* Filter Column Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Filter Column (Optional)
            </Label>
            <Select
              value={selectedFilterColumn || "none"}
              onValueChange={(value) => onFilterColumnSelect(value === "none" ? undefined : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select filter column (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="surveysparrow">surveysparrow</SelectItem>
                <SelectItem value="thrivesparrow">thrivesparrow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedAssessmentId && selectedTestName && selectedAssessmentName ? (
            // Selected Assessment Display
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">{selectedAssessmentName}</h4>
                    <p className="text-sm text-blue-700">from {selectedTestName}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConfigure}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAssessment}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Configure Assessment Button
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">No assessment selected</h4>
                  <p className="text-sm text-gray-600">Choose a Sparrow Assessment to link with this round</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleConfigure}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Select Assessment
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assessment Selection Modal */}
      <SparrowAssessmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleAssessmentSelect}
        selectedAssessmentId={selectedAssessmentId}
      />
    </div>
  )
}
