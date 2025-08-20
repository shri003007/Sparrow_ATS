"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Plus, Download, Edit2, Trash2, ExternalLink, File, Loader2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  ProjectAsset, 
  getAssets, 
  deleteAsset, 
  updateAsset, 
  getAssetDownloadUrl,
  formatFileSize,
  getFileIcon
} from "@/lib/api/assets"

interface AssetManagementTableProps {
  candidateId: string
  jobRoundTemplateId: string
  onAddAsset: () => void
  refreshTrigger?: number
}

export function AssetManagementTable({ 
  candidateId, 
  jobRoundTemplateId, 
  onAddAsset,
  refreshTrigger = 0
}: AssetManagementTableProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState<string>('')
  const [savingDescription, setSavingDescription] = useState<boolean>(false)
  const [downloadingAssets, setDownloadingAssets] = useState<Set<string>>(new Set())
  const [deletingAssets, setDeletingAssets] = useState<Set<string>>(new Set())

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    if (!candidateId || !jobRoundTemplateId) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await getAssets(candidateId, jobRoundTemplateId)
      setAssets(response.assets.filter(asset => asset.status === 'ACTIVE'))
    } catch (err) {
      console.error('Failed to fetch assets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [candidateId, jobRoundTemplateId])

  // Fetch assets on mount and when refresh trigger changes
  useEffect(() => {
    fetchAssets()
  }, [fetchAssets, refreshTrigger])

  // Handle asset selection
  const handleAssetSelection = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets)
    if (checked) {
      newSelected.add(assetId)
    } else {
      newSelected.delete(assetId)
    }
    setSelectedAssets(newSelected)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assets.map(asset => asset.asset_id)))
    } else {
      setSelectedAssets(new Set())
    }
  }

  // Handle description edit
  const startEditDescription = (asset: ProjectAsset) => {
    setEditingDescription(asset.asset_id)
    setEditDescription(asset.description)
  }

  const cancelEditDescription = () => {
    setEditingDescription(null)
    setEditDescription('')
  }

  const saveDescription = async (assetId: string) => {
    try {
      setSavingDescription(true)
      await updateAsset(candidateId, jobRoundTemplateId, assetId, {
        description: editDescription
      })
      
      // Update local state
      setAssets(prev => prev.map(asset => 
        asset.asset_id === assetId 
          ? { ...asset, description: editDescription }
          : asset
      ))
      
      setEditingDescription(null)
      setEditDescription('')
    } catch (err) {
      console.error('Failed to update description:', err)
      setError(err instanceof Error ? err.message : 'Failed to update description')
    } finally {
      setSavingDescription(false)
    }
  }

  // Handle asset download
  const handleDownload = async (asset: ProjectAsset) => {
    try {
      setDownloadingAssets(prev => new Set(prev).add(asset.asset_id))
      
      const downloadResponse = await getAssetDownloadUrl(
        candidateId, 
        jobRoundTemplateId, 
        asset.asset_id
      )
      
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadResponse.download_url
      link.download = downloadResponse.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to download asset:', err)
      setError(err instanceof Error ? err.message : 'Failed to download asset')
    } finally {
      setDownloadingAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(asset.asset_id)
        return newSet
      })
    }
  }

  // Handle asset deletion
  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return
    }

    try {
      setDeletingAssets(prev => new Set(prev).add(assetId))
      await deleteAsset(candidateId, jobRoundTemplateId, assetId)
      
      // Remove from local state
      setAssets(prev => prev.filter(asset => asset.asset_id !== assetId))
      setSelectedAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    } catch (err) {
      console.error('Failed to delete asset:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete asset')
    } finally {
      setDeletingAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    }
  }

  // Handle external URL open
  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600" style={{ fontFamily }}>
          Loading assets...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
            Project Assets
          </h3>
          <p className="text-sm text-gray-500" style={{ fontFamily }}>
            {assets.length} asset{assets.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button
          onClick={onAddAsset}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600" style={{ fontFamily }}>
            {error}
          </p>
        </div>
      )}

      {/* Assets Table */}
      {assets.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <File className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-1" style={{ fontFamily }}>
            No assets uploaded
          </h4>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily }}>
            Upload files or add links to get started with this candidate's project assets.
          </p>
          <Button onClick={onAddAsset} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Asset
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-gray-50">
                <TableRow>
                  <TableHead className="w-16 px-4 py-3">
                    <Checkbox
                      checked={selectedAssets.size === assets.length && assets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-80 px-4 py-3" style={{ fontFamily }}>Asset</TableHead>
                  <TableHead className="w-96 px-4 py-3" style={{ fontFamily }}>Description</TableHead>
                  <TableHead className="w-24 px-4 py-3" style={{ fontFamily }}>Type</TableHead>
                  <TableHead className="w-24 px-4 py-3" style={{ fontFamily }}>Size</TableHead>
                  <TableHead className="w-24 px-4 py-3" style={{ fontFamily }}>Source</TableHead>
                  <TableHead className="w-32 px-4 py-3" style={{ fontFamily }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.asset_id}>
                  <TableCell className="w-16 px-4 py-3">
                    <Checkbox
                      checked={selectedAssets.has(asset.asset_id)}
                      onCheckedChange={(checked) => 
                        handleAssetSelection(asset.asset_id, checked as boolean)
                      }
                    />
                  </TableCell>
                  
                  <TableCell className="w-80 px-4 py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg flex-shrink-0">
                              {getFileIcon(asset.mime_type)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate" style={{ fontFamily }}>
                                {asset.original_name}
                              </div>
                              <div className="text-xs text-gray-500" style={{ fontFamily }}>
                                {new Date(asset.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-md">{asset.original_name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  
                  <TableCell className="w-96 px-4 py-3">
                    {editingDescription === asset.asset_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="text-sm"
                          placeholder="Enter description..."
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveDescription(asset.asset_id)}
                          disabled={savingDescription}
                        >
                          {savingDescription ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditDescription}
                          disabled={savingDescription}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-gray-600 truncate block" style={{ fontFamily }}>
                                {asset.description || 'No description'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-md">{asset.description || 'No description'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => startEditDescription(asset)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="w-24 px-4 py-3">
                    <span className="text-sm text-gray-600 truncate block" style={{ fontFamily }}>
                      {asset.asset_type}
                    </span>
                  </TableCell>
                  
                  <TableCell className="w-24 px-4 py-3">
                    <span className="text-sm text-gray-600 truncate block" style={{ fontFamily }}>
                      {formatFileSize(asset.file_size)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="w-24 px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600 truncate" style={{ fontFamily }}>
                        {asset.source_type}
                      </span>
                      {asset.source_type === 'URL' && asset.original_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenUrl(asset.original_url!)}
                          className="p-1 flex-shrink-0"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="w-32 px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(asset)}
                        disabled={downloadingAssets.has(asset.asset_id)}
                        className="p-1"
                        title="Download"
                      >
                        {downloadingAssets.has(asset.asset_id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(asset.asset_id)}
                        disabled={deletingAssets.has(asset.asset_id)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        {deletingAssets.has(asset.asset_id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAssets.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700" style={{ fontFamily }}>
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAssets(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
