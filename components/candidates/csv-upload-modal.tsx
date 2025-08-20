"use client"

import { useState, useRef } from "react"
import { X, Upload, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileUpload: (file: File) => void
  onProcessCSV: () => void
  uploadedFile: File | null
  isProcessing: boolean
}

export function CSVUploadModal({ 
  isOpen, 
  onClose, 
  onFileUpload, 
  onProcessCSV,
  uploadedFile,
  isProcessing 
}: CSVUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === 'text/csv') {
      onFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileUpload(files[0])
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-8 max-w-lg w-full mx-4 relative"
        style={{ fontFamily }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowUp className="w-8 h-8 text-blue-600" />
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#111827", fontFamily }}
          >
            Import data
          </h2>
          <p
            className="text-gray-600"
            style={{ fontSize: "14px", fontFamily }}
          >
            You can import people into Contacts by uploading a CSV file.
          </p>
          <div className="mt-2">
            <span className="text-sm text-gray-500">Need help? </span>
            <button className="text-sm text-blue-600 hover:underline">
              Read more
            </button>
            <span className="text-sm text-gray-500"> about our import tool or </span>
            <button className="text-sm text-blue-600 hover:underline">
              get in touch
            </button>
            <span className="text-sm text-gray-500"> with the team.</span>
          </div>
        </div>

        {/* File Upload Area */}
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p
              className="text-gray-600 mb-4"
              style={{ fontSize: "16px", fontFamily }}
            >
              Drag and drop your CSV file here, or
            </p>
            <Button
              onClick={handleBrowseClick}
              variant="default"
              style={{
                backgroundColor: "#4F46E5",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              Choose a CSV file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          /* File Selected */
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "#111827", fontSize: "14px", fontFamily }}
                  >
                    {uploadedFile.name}
                  </p>
                  <p
                    className="text-gray-500 text-sm"
                    style={{ fontFamily }}
                  >
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Change file
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontFamily,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onProcessCSV}
            disabled={!uploadedFile || isProcessing}
            style={{
              backgroundColor: uploadedFile && !isProcessing ? "#4F46E5" : "#9CA3AF",
              color: "#FFFFFF",
              fontFamily,
            }}
          >
            {isProcessing ? "Processing..." : "Process CSV"}
          </Button>
        </div>
      </div>
    </div>
  )
}