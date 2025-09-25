'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Download, Trash2, FileText, AlertCircle } from "lucide-react"
import { CandidateResumeApi, ResumeNotFoundError, type ResumeInfo } from "@/lib/api/candidate-resume"
import { PDFPreview } from "./pdf-preview"

interface CandidateResumeViewProps {
  candidateEmail: string
  candidateName: string
  resumeInfo: ResumeInfo | null
  isLoading: boolean
  error: string | null
  onResumeUpdate?: () => void
}

export function CandidateResumeView({ 
  candidateEmail, 
  candidateName, 
  resumeInfo: propResumeInfo, 
  isLoading: propIsLoading, 
  error: propError, 
  onResumeUpdate 
}: CandidateResumeViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Use prop data instead of internal state
  const resumeInfo = propResumeInfo
  const isLoading = propIsLoading
  const error = propError || localError


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setLocalError('Please select a PDF file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setLocalError('File size must be less than 10MB')
      return
    }

    try {
      setIsUploading(true)
      setLocalError(null)

      const base64Content = await CandidateResumeApi.fileToBase64(file)
      
      await CandidateResumeApi.uploadResume({
        candidate_email: candidateEmail,
        file_content: base64Content,
        filename: file.name
      })

      // Refresh resume info after upload
      if (onResumeUpdate) {
        onResumeUpdate()
      }
    } catch (error) {
      console.error('Failed to upload resume:', error)
      setLocalError(error instanceof Error ? error.message : 'Failed to upload resume')
    } finally {
      setIsUploading(false)
      // Clear the input
      event.target.value = ''
    }
  }

  const handleDownload = () => {
    if (resumeInfo?.presigned_url) {
      window.open(resumeInfo.presigned_url, '_blank')
    }
  }

  const handleDelete = async () => {
    if (!resumeInfo) return

    if (!window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      setLocalError(null)

      await CandidateResumeApi.deleteResume(candidateEmail)
      
      // Refresh resume info after deletion
      if (onResumeUpdate) {
        onResumeUpdate()
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
      setLocalError(error instanceof Error ? error.message : 'Failed to delete resume')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily }}>
            <FileText className="w-5 h-5" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium" style={{ fontFamily }}>Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm" style={{ fontFamily }}>{error}</span>
          </div>
        )}

        {resumeInfo ? (
          <div className="space-y-4">
            {/* Resume Preview */}
            <PDFPreview 
              pdfUrl={resumeInfo.presigned_url}
              maxHeight={500}
              className="w-full"
            />

            {/* Upload New Resume */}
            <div className="pt-4 border-t">
              <label htmlFor="resume-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600" style={{ fontFamily }}>
                    {isUploading ? 'Uploading...' : 'Upload New Resume'}
                  </span>
                </div>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          // No Resume State
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
              No Resume Uploaded
            </h3>
            <p className="text-gray-600 mb-4" style={{ fontFamily }}>
              Upload a PDF resume for {candidateName}
            </p>
            
            <label htmlFor="resume-upload-empty" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                <span style={{ fontFamily }}>
                  {isUploading ? 'Uploading...' : 'Upload Resume'}
                </span>
              </div>
              <input
                id="resume-upload-empty"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
