import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Settings, Save, X, Loader2 } from "lucide-react"

interface EvaluationCriteriaEditorProps {
  isOpen: boolean
  onClose: () => void
  pipelineId?: string
  roundName: string
  currentCriteria?: string
  onSave: (pipelineId: string, criteria: string) => Promise<any>
  onFetch: (pipelineId: string) => Promise<any>
}

export function EvaluationCriteriaEditor({
  isOpen,
  onClose,
  pipelineId,
  roundName,
  currentCriteria = "",
  onSave,
  onFetch
}: EvaluationCriteriaEditorProps) {
  const [criteria, setCriteria] = useState(currentCriteria)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch existing criteria when dialog opens
  useEffect(() => {
    if (isOpen && pipelineId) {
      fetchExistingCriteria()
    }
  }, [isOpen, pipelineId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCriteria("")
      setLoading(false)
      setSaving(false)
    }
  }, [isOpen])

  const fetchExistingCriteria = async () => {
    if (!pipelineId) return

    setLoading(true)
    try {
      const result = await onFetch(pipelineId)
      if (result && result.evaluation_criteria) {
        setCriteria(result.evaluation_criteria)
      }
    } catch (error) {
      console.error('Error fetching evaluation criteria:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!pipelineId) {
      return
    }

    setSaving(true)
    try {
      await onSave(pipelineId, criteria)
      onClose()
    } catch (error) {
      console.error('Error saving evaluation criteria:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setCriteria(currentCriteria)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Edit Evaluation Criteria - {roundName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Evaluation Criteria
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading criteria...</span>
              </div>
            ) : (
              <Textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder="Enter evaluation criteria for this round..."
                className="min-h-[200px] resize-none"
                disabled={saving}
              />
            )}
          </div>
          
          
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Criteria
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 