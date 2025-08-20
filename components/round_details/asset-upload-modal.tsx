"use client"

import React, { useState } from "react"
import { X, Upload, Link, File, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { uploadFileAsset, addAssetFromUrl, type AssetUploadRequest, type AssetUrlRequest } from "@/lib/api/assets"

interface AssetUploadModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: string
  jobRoundTemplateId: string
  onAssetUploaded: () => void
}

export function AssetUploadModal({
  isOpen,
  onClose,
  candidateId,
  jobRoundTemplateId,
  onAssetUploaded
}: AssetUploadModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file')
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState<string>('')
  
  // URL upload state
  const [assetUrl, setAssetUrl] = useState<string>('')
  const [urlDescription, setUrlDescription] = useState<string>('')
  const [downloadUrl, setDownloadUrl] = useState<boolean>(true)

  const resetForm = () => {
    setSelectedFile(null)
    setFileDescription('')
    setAssetUrl('')
    setUrlDescription('')
    setDownloadUrl(true)
    setError(null)
    setActiveTab('file')
  }

  const handleClose = () => {
    if (!uploading) {
      resetForm()
      onClose()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        setError('File size exceeds 50MB limit')
        return
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-rar-compressed'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, or RAR files.')
        return
      }
      
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Convert file to base64
      const arrayBuffer = await selectedFile.arrayBuffer()
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const request: AssetUploadRequest = {
        file_content: base64String,
        filename: selectedFile.name,
        content_type: selectedFile.type,
        description: fileDescription.trim() || selectedFile.name,
        created_by: 'current_user' // TODO: Get from auth context
      }

      await uploadFileAsset(candidateId, jobRoundTemplateId, request)
      
      onAssetUploaded()
      handleClose()
    } catch (err) {
      console.error('File upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleUrlUpload = async () => {
    if (!assetUrl.trim()) {
      setError('Please enter a valid URL')
      return
    }

    // Basic URL validation
    try {
      new URL(assetUrl)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    try {
      setUploading(true)
      setError(null)

      const request: AssetUrlRequest = {
        url: assetUrl.trim(),
        description: urlDescription.trim() || assetUrl,
        created_by: 'current_user', // TODO: Get from auth context
        download: downloadUrl
      }

      await addAssetFromUrl(candidateId, jobRoundTemplateId, request)
      
      onAssetUploaded()
      handleClose()
    } catch (err) {
      console.error('URL upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add asset from URL')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
              Add Project Asset
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={uploading}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'file' | 'url')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Add URL
                </TabsTrigger>
              </TabsList>

              {/* File Upload Tab */}
              <TabsContent value="file" className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="text-sm font-medium">
                    Select File
                  </Label>
                  <div className="mt-1">
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                  </div>
                  {selectedFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <File className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                      <span className="text-gray-400">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="file-description" className="text-sm font-medium">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="file-description"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    disabled={uploading}
                    placeholder="Describe this asset..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR<br/>
                  Maximum file size: 50MB
                </div>
              </TabsContent>

              {/* URL Tab */}
              <TabsContent value="url" className="space-y-4">
                <div>
                  <Label htmlFor="asset-url" className="text-sm font-medium">
                    Asset URL
                  </Label>
                  <Input
                    id="asset-url"
                    type="url"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    disabled={uploading}
                    placeholder="https://example.com/document.pdf"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="url-description" className="text-sm font-medium">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="url-description"
                    value={urlDescription}
                    onChange={(e) => setUrlDescription(e.target.value)}
                    disabled={uploading}
                    placeholder="Describe this asset..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="download-url"
                    checked={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.checked)}
                    disabled={uploading}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="download-url" className="text-sm">
                    Download and store file in our system
                  </Label>
                </div>
              </TabsContent>
            </Tabs>

            {/* Error Message */}
            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600" style={{ fontFamily }}>
                  {error}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={activeTab === 'file' ? handleFileUpload : handleUrlUpload}
              disabled={uploading || (activeTab === 'file' ? !selectedFile : !assetUrl.trim())}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {activeTab === 'file' ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                <>
                  {activeTab === 'file' ? (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Add URL
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
