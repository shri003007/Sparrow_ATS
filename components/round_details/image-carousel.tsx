"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/audioPlayer'

interface CarouselImage {
  filename: string
  url: string
  size: number
  key: string
  timestamp?: number
}

interface ImageCarouselProps {
  images: CarouselImage[]
  currentAudioTime: number
  onImageClick?: (timestamp: number) => void
  audioUrl?: string
  onAudioTimeUpdate?: (time: number) => void
}

// Extract timestamp from filename like "image_1755870012881_nrir2295x.jpg"
const extractTimestamp = (filename: string): number => {
  const match = filename.match(/image_(\d+)_/)
  return match ? parseInt(match[1]) : 0
}

// Calculate display time based on timestamp (images taken every 20 seconds)
const calculateDisplayTime = (timestamp: number, startTime: number): number => {
  return Math.floor((timestamp - startTime) / 1000) // Convert to seconds
}

export function ImageCarousel({ images, currentAudioTime, onImageClick, audioUrl, onAudioTimeUpdate }: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [processedImages, setProcessedImages] = useState<CarouselImage[]>([])
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined)
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map())

  // Process images to extract timestamps and sort them
  useEffect(() => {
    if (!images || images.length === 0) return

    const imagesWithTimestamps = images.map(image => ({
      ...image,
      timestamp: extractTimestamp(image.filename)
    })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

    setProcessedImages(imagesWithTimestamps)
  }, [images])

  // Preload images for smooth transitions
  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve, reject) => {
        if (preloadedImages.has(url)) {
          resolve()
          return
        }

        const img = new Image()
        img.onload = () => {
          setPreloadedImages(prev => new Set(prev).add(url))
          imageRefs.current.set(url, img)
          resolve()
        }
        img.onerror = reject
        img.src = url
      })
    }

    const preloadCurrentAndNext = async () => {
      if (processedImages.length === 0) return

      // Preload current image
      const currentImage = processedImages[currentImageIndex]
      if (currentImage) {
        try {
          await preloadImage(currentImage.url)
        } catch (error) {
          console.warn('Failed to preload current image:', error)
        }
      }

      // Preload next few images
      const preloadCount = Math.min(3, processedImages.length - currentImageIndex - 1)
      for (let i = 1; i <= preloadCount; i++) {
        const nextIndex = currentImageIndex + i
        if (nextIndex < processedImages.length) {
          const nextImage = processedImages[nextIndex]
          try {
            await preloadImage(nextImage.url)
          } catch (error) {
            console.warn(`Failed to preload image ${i} ahead:`, error)
          }
        }
      }
    }

    preloadCurrentAndNext()
  }, [currentImageIndex, processedImages, preloadedImages])

  // Update current image based on audio time
  useEffect(() => {
    if (processedImages.length === 0) return

    const startTime = processedImages[0]?.timestamp || 0
    
    // Find the appropriate image for current audio time
    let targetIndex = 0
    for (let i = 0; i < processedImages.length; i++) {
      const displayTime = calculateDisplayTime(processedImages[i].timestamp || 0, startTime)
      if (currentAudioTime >= displayTime) {
        targetIndex = i
      } else {
        break
      }
    }

    setCurrentImageIndex(targetIndex)
  }, [currentAudioTime, processedImages])

  if (!processedImages || processedImages.length === 0) {
    return null
  }

  const currentImage = processedImages[currentImageIndex]
  const startTime = processedImages[0]?.timestamp || 0

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1
      setCurrentImageIndex(newIndex)
      const newImage = processedImages[newIndex]
      const displayTime = calculateDisplayTime(newImage.timestamp || 0, startTime)
      onImageClick?.(displayTime)
    }
  }

  const handleNext = () => {
    if (currentImageIndex < processedImages.length - 1) {
      const newIndex = currentImageIndex + 1
      setCurrentImageIndex(newIndex)
      const newImage = processedImages[newIndex]
      const displayTime = calculateDisplayTime(newImage.timestamp || 0, startTime)
      onImageClick?.(displayTime)
    }
  }

  const handleImageClick = () => {
    const displayTime = calculateDisplayTime(currentImage.timestamp || 0, startTime)
    setSeekTime(displayTime)
    onImageClick?.(displayTime)
    setTimeout(() => setSeekTime(undefined), 100)
  }

  const handleAudioTimeUpdate = (time: number) => {
    onAudioTimeUpdate?.(time)
  }

  const formatTimestamp = (timestamp: number) => {
    const displayTime = calculateDisplayTime(timestamp, startTime)
    const minutes = Math.floor(displayTime / 60)
    const seconds = displayTime % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#5BA4A4', color: 'white' }}
        >
          <Camera className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-medium text-gray-700">Screen Recording</h4>
        <span className="text-xs text-gray-500">
          {currentImageIndex + 1} / {processedImages.length}
        </span>
        {!preloadedImages.has(currentImage.url) && (
          <span className="text-xs text-yellow-600">Loading...</span>
        )}
      </div>

      <div className="relative">
        {/* Main Image Display */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
          <img
            src={currentImage.url}
            alt={`Screenshot at ${formatTimestamp(currentImage.timestamp || 0)}`}
            className="w-full h-full object-contain cursor-pointer transition-transform duration-200"
            onClick={handleImageClick}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
          
          {/* Audio Controls Overlay */}
          {audioUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <AudioPlayer 
                audioUrl={audioUrl}
                onError={(error) => console.error('Audio playback error:', error)}
                onTimeUpdate={handleAudioTimeUpdate}
                seekToTime={seekTime}
                compact={true}
              />
            </div>
          )}
          
          {/* Timestamp Overlay */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formatTimestamp(currentImage.timestamp || 0)}
          </div>

          {/* Loading Indicator */}
          {!preloadedImages.has(currentImage.url) && (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <button
          onClick={handlePrevious}
          disabled={currentImageIndex === 0}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-75 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentImageIndex === processedImages.length - 1}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center hover:bg-opacity-75 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Dots */}
      <div className="flex justify-center mt-3 space-x-1">
        {processedImages.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentImageIndex(index)
              const displayTime = calculateDisplayTime(processedImages[index].timestamp || 0, startTime)
              onImageClick?.(displayTime)
            }}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentImageIndex 
                ? 'bg-teal-500' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            style={index === currentImageIndex ? { backgroundColor: '#5BA4A4' } : {}}
          />
        ))}
      </div>

      <div className="text-xs text-gray-500 text-center mt-2">
        Click image or use arrows to jump to specific moments
      </div>
    </div>
  )
}
