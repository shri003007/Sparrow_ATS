'use client'

import React, { useState, useEffect } from 'react'
import { Download, FileText, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface PDFPreviewProps {
  pdfUrl: string
  className?: string
  maxHeight?: number
}

export function PDFPreview({ pdfUrl, className = '', maxHeight = 600 }: PDFPreviewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Simulate loading time for the iframe
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Failed to load PDF preview. Please try downloading the file.')
  }

  const openInNewTab = () => {
    window.open(pdfUrl, '_blank')
  }

  const downloadPdf = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = 'resume.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Show loading state during SSR and initial client load
  if (!isClient) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 flex justify-center" style={{ height: `${maxHeight}px` }}>
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <div className="text-red-600 mb-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
          Unable to Preview PDF
        </h3>
        <p className="text-gray-600 mb-4" style={{ fontFamily }}>
          {error}
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={downloadPdf} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <Button onClick={openInNewTab} variant="outline" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* PDF Controls */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600" style={{ fontFamily }}>
            PDF Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            className="flex items-center gap-1 h-8"
          >
            <Download className="w-3 h-3" />
            <span className="text-xs">Download</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
            className="flex items-center gap-1 h-8"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="text-xs">Open</span>
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div 
        className="relative bg-gray-100"
        style={{ height: `${maxHeight}px` }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span className="text-sm text-gray-600" style={{ fontFamily }}>
                Loading PDF...
              </span>
            </div>
          </div>
        )}
        
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="PDF Preview"
          style={{
            minHeight: '100%',
            background: 'white'
          }}
        />
      </div>
    </div>
  )
}