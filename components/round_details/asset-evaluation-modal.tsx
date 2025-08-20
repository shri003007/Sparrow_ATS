"use client"

import React, { useState, useEffect } from "react"
import { X, CheckCircle, Loader2, AlertCircle, FileText, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getAssets, type ProjectAsset, type AssetListResponse } from "@/lib/api/assets"
import { evaluateProjectCandidate, type ProjectEvaluationRequest } from "@/lib/api/project-evaluation"
import type { RoundCandidate } from "@/lib/round-candidate-types"

interface AssetEvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: RoundCandidate | null
  onEvaluationComplete: (updatedCandidate: RoundCandidate) => void
}

export function AssetEvaluationModal({ 
  isOpen, 
  onClose, 
  candidate,
  onEvaluationComplete 
}: AssetEvaluationModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [evaluating, setEvaluating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch assets when modal opens
  useEffect(() => {
    if (isOpen && candidate?.id && candidate?.candidate_rounds?.[0]?.job_round_template_id) {
      fetchAssets()
    }
  }, [isOpen, candidate?.id, candidate?.candidate_rounds?.[0]?.job_round_template_id])

  const fetchAssets = async () => {
    if (!candidate?.id || !candidate?.candidate_rounds?.[0]?.job_round_template_id) return

    try {
      setLoading(true)
      setError(null)
      const assetsData = await getAssets(
        candidate.id,
        candidate.candidate_rounds[0].job_round_template_id
      )
      setAssets(assetsData.assets)
    } catch (err) {
      console.error('Failed to fetch assets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assets')
    } finally {
      setLoading(false)
    }
  }

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(assetId)
      } else {
        newSet.delete(assetId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set())
    } else {
              setSelectedAssetIds(new Set(assets.map(asset => asset.asset_id)))
    }
  }

  const handleEvaluate = async () => {
    if (selectedAssetIds.size === 0) {
      setError('Please select at least one asset for evaluation')
      return
    }

    if (!candidate?.id || !candidate?.candidate_rounds?.[0]?.job_round_template_id) {
      setError('Missing candidate or round information')
      return
    }

    try {
      setEvaluating(true)
      setError(null)

      const request: ProjectEvaluationRequest = {
        asset_ids: Array.from(selectedAssetIds),
        job_round_template_id: candidate.candidate_rounds[0].job_round_template_id,
        candidate_id: candidate.id
      }

      const result = await evaluateProjectCandidate(request)

      if (result.success) {
        // Create updated candidate with evaluation results
        const updatedCandidate: RoundCandidate = {
          ...candidate,
          candidate_rounds: candidate.candidate_rounds.map(round => ({
            ...round,
            is_evaluation: true,
            evaluations: [{
              id: result.candidate_round_id || `eval-${Date.now()}`,
              candidate_round_id: round.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              evaluation_result: {
                evaluation_summary: result.evaluation_summary,
                competency_evaluation: result.competency_evaluation,
                overall_percentage_score: result.overall_percentage_score,
                evaluated_assets: result.evaluated_asset_ids.map(assetId => {
                  const asset = assets.find(a => a.asset_id === assetId)
                  return {
                    asset_id: assetId,
                    original_name: asset?.original_name || 'Unknown Asset'
                  }
                })
              }
            }]
          }))
        }

        onEvaluationComplete(updatedCandidate)
        onClose()
      } else {
        setError(result.message || 'Evaluation failed')
      }
    } catch (err) {
      console.error('Evaluation error:', err)
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setEvaluating(false)
    }
  }

  const handleClose = () => {
    if (!evaluating) {
      setSelectedAssetIds(new Set())
      setError(null)
      onClose()
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  if (!isOpen || !candidate) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
                Project Evaluation - {candidate.name}
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Select assets to evaluate for this project candidate
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={evaluating}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600" style={{ fontFamily }}>Loading assets...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                  No Assets Found
                </h3>
                <p className="text-gray-500 max-w-md" style={{ fontFamily }}>
                  This candidate has no uploaded assets. Please upload assets before attempting evaluation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={evaluating}
                    >
                      {selectedAssetIds.size === assets.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-gray-600" style={{ fontFamily }}>
                      {selectedAssetIds.size} of {assets.length} assets selected
                    </span>
                  </div>
                </div>

                {/* Assets Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="w-80 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Asset
                          </th>
                          <th className="w-96 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type & Size
                          </th>
                          <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                                              {assets.map((asset) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50">
                          <td className="w-16 px-4 py-3">
                            <Checkbox
                              checked={selectedAssetIds.has(asset.asset_id)}
                              onCheckedChange={(checked) => 
                                handleAssetSelection(asset.asset_id, checked as boolean)
                              }
                              disabled={evaluating}
                            />
                          </td>
                          <td className="w-80 px-4 py-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {getFileTypeIcon(asset.original_name)}
                                    <span 
                                      className="text-sm font-medium text-gray-900 truncate" 
                                      style={{ fontFamily }}
                                    >
                                      {asset.original_name}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-md">{asset.original_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="w-96 px-4 py-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span 
                                    className="text-sm text-gray-600 block truncate" 
                                    style={{ fontFamily }}
                                  >
                                    {asset.description || 'No description'}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-md">{asset.description || 'No description'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="w-32 px-4 py-3">
                            <div className="text-sm text-gray-600" style={{ fontFamily }}>
                              <div className="truncate">{asset.source_type}</div>
                              <div className="text-xs text-gray-400 truncate">
                                {asset.file_size ? formatFileSize(asset.file_size) : 'Unknown size'}
                              </div>
                            </div>
                          </td>
                          <td className="w-24 px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {asset.source_type === 'UPLOAD' && asset.s3_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(asset.s3_url, '_blank')}
                                  className="p-1"
                                  title="Download file"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              {asset.source_type === 'URL' && asset.original_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(asset.original_url, '_blank')}
                                  className="p-1"
                                  title="Open URL"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600" style={{ fontFamily }}>
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={evaluating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEvaluate}
              disabled={evaluating || selectedAssetIds.size === 0 || assets.length === 0}
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Evaluate Project ({selectedAssetIds.size} assets)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
